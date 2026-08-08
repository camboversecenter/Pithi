-- ====================================================================
-- MIGRATION 006 — Configurable super administrator
-- ====================================================================
-- Run once in the Supabase SQL Editor. Idempotent and non-destructive.
--
-- Migrations 001/002 hardcoded a single super-administrator email address
-- into three SECURITY DEFINER functions. That is fine for one deployment but
-- wrong for a public repository: every fork inherits an administrator it did
-- not choose, and the address cannot be changed without editing SQL.
--
-- This migration moves the address into a settings table that is unreadable
-- and unwritable through the public API, and rewrites the three functions to
-- read from it.
--
-- IMPORTANT — after running this, set your own address:
--
--     select public.set_super_admin_email('you@example.com');
--
-- and set the matching VITE_SUPER_ADMIN_EMAIL in your .env.local so the client
-- agrees with the server.
--
-- Until it is set there is NO super administrator. This is a safe state:
-- accounts that already hold the ADMIN role keep every admin privilege, and
-- new admins can still be granted from the Admin dashboard. Only the
-- promote-by-email-on-sign-in shortcut is inactive.
-- ====================================================================

-- 1. Settings store -------------------------------------------------------
create table if not exists public.app_settings (
    key   text primary key,
    value text
);

-- Locked down: no anon/authenticated access at all. The values are read only
-- through the SECURITY DEFINER helpers below, which run as the table owner.
alter table public.app_settings enable row level security;
revoke all on table public.app_settings from anon, authenticated;

-- No policies are defined on purpose. With RLS enabled and no policy, every
-- API-issued query returns zero rows even if a GRANT is added back by mistake.

-- 2. Read helper ----------------------------------------------------------
create or replace function public.super_admin_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select nullif(lower(trim(value)), '')
    from public.app_settings
    where key = 'super_admin_email';
$$;

-- Used inside RLS/trigger logic on behalf of the caller, so it must be
-- executable by them; it discloses nothing beyond the address itself.
revoke execute on function public.super_admin_email() from public, anon;
grant execute on function public.super_admin_email() to authenticated;

-- 3. Write helper (SQL editor / service role only) ------------------------
create or replace function public.set_super_admin_email(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email text := nullif(lower(trim(p_email)), '');
begin
    insert into public.app_settings (key, value)
    values ('super_admin_email', v_email)
    on conflict (key) do update set value = excluded.value;

    return v_email;
end;
$$;

-- Never callable from the browser: changing this address is a privilege grant.
revoke execute on function public.set_super_admin_email(text) from public, anon, authenticated;

-- 4. Rewrite the guards to read the configured address --------------------
create or replace function public.enforce_user_role_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    actor_role  text;
    actor_email text;
    super_email text;
    is_privileged boolean;
begin
    -- Trusted direct-database / service-role contexts have no end-user JWT.
    if auth.uid() is null then
        return new;
    end if;

    actor_email := lower(trim(auth.jwt() ->> 'email'));
    super_email := public.super_admin_email();
    select role into actor_role from public.users where id = auth.uid();

    is_privileged := (actor_role = 'ADMIN')
                  or (super_email is not null and actor_email = super_email);

    if tg_op = 'INSERT' then
        if new.role = 'ADMIN' and not is_privileged then
            raise exception 'Only administrators may assign the ADMIN role.';
        end if;
        return new;
    end if;

    if new.role is distinct from old.role and not is_privileged then
        raise exception 'You are not allowed to change your account role.';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_enforce_user_role_integrity on public.users;
create trigger trg_enforce_user_role_integrity
    before insert or update on public.users
    for each row execute function public.enforce_user_role_integrity();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    super_email text := public.super_admin_email();
begin
    -- Everyone else picks their role on the in-app Role Selection screen.
    if super_email is not null and lower(trim(new.email)) = super_email then
        insert into public.users (id, name, email, role, "avatarUrl")
        values (
            new.id,
            coalesce(new.raw_user_meta_data->>'full_name', 'Super Admin'),
            new.email,
            'ADMIN',
            coalesce(new.raw_user_meta_data->>'avatar_url', '')
        )
        on conflict (id) do update set role = 'ADMIN';
    end if;
    return new;
end;
$$;

create or replace function public.register_profile(p_role text)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
    v_id    uuid := auth.uid();
    v_email text := auth.jwt() ->> 'email';
    v_name  text := coalesce(
        auth.jwt() -> 'user_metadata' ->> 'full_name',
        nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1), ''),
        'User'
    );
    v_avatar      text := auth.jwt() -> 'user_metadata' ->> 'avatar_url';
    v_role        text := p_role;
    v_super_email text := public.super_admin_email();
    v_result      public.users;
begin
    if v_id is null then
        raise exception 'Not authenticated';
    end if;

    -- The super admin is always ADMIN; nobody else may self-assign ADMIN.
    if v_super_email is not null and lower(trim(v_email)) = v_super_email then
        v_role := 'ADMIN';
    elsif v_role not in ('GENERAL_USER','ORGANIZER','CHEF','HALL','MUSIC_BAND','BEAUTY_SALON') then
        raise exception 'Invalid role %', p_role;
    end if;

    insert into public.users (id, name, email, role, "avatarUrl")
    values (v_id, v_name, v_email, v_role, v_avatar)
    on conflict (id) do update set
        name = excluded.name,
        "avatarUrl" = excluded."avatarUrl"
    returning * into v_result;

    return v_result;
end;
$$;

revoke execute on function public.enforce_user_role_integrity() from public, anon, authenticated;
revoke execute on function public.register_profile(text) from public, anon;
grant execute on function public.register_profile(text) to authenticated;

-- 5. Carry over an existing deployment's address --------------------------
-- If this database already has exactly one ADMIN, adopt it as the super admin
-- so an existing deployment keeps working unchanged. Fresh databases (no
-- admins yet) are left unconfigured for the operator to set explicitly.
do $$
declare
    v_existing text;
begin
    if exists (select 1 from public.app_settings where key = 'super_admin_email') then
        return; -- already configured; never overwrite
    end if;

    select email into v_existing
    from public.users
    where role = 'ADMIN'
    limit 2;

    if (select count(*) from public.users where role = 'ADMIN') = 1 then
        perform public.set_super_admin_email(v_existing);
        raise notice 'Adopted existing sole administrator % as super admin.', v_existing;
    else
        raise notice 'No super admin configured. Run: select public.set_super_admin_email(''you@example.com'');';
    end if;
end $$;
