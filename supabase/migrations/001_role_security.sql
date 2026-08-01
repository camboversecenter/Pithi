-- ====================================================================
-- MIGRATION 001 — Role security & registration flow
-- ====================================================================
-- Run this once in the Supabase SQL Editor on an existing PITHI database.
-- It is idempotent (safe to run more than once) and does NOT drop any data.
--
-- It fixes two issues:
--   1. Privilege escalation: the "self-update" RLS policy on public.users
--      let any authenticated user set their own role to 'ADMIN'. A trigger
--      now blocks role assignment/changes unless performed by an admin (or
--      the super admin, identified by verified OAuth email).
--   2. Registration flow: the previous handle_new_user() auto-created every
--      new user as GENERAL_USER, silently bypassing the in-app Role Selection
--      screen. It now auto-provisions only the super administrator; everyone
--      else picks their role in the app.
-- ====================================================================

-- 1. Role integrity guard --------------------------------------------
create or replace function public.enforce_user_role_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    actor_role text;
    actor_email text;
    is_privileged boolean;
begin
    -- Trusted direct-database / service-role contexts have no end-user JWT.
    if auth.uid() is null then
        return new;
    end if;

    actor_email := auth.jwt() ->> 'email';
    select role into actor_role from public.users where id = auth.uid();
    is_privileged := (actor_role = 'ADMIN') or (actor_email = 'pithi.deva@gmail.com');

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

-- 2. Reconcile the auth auto-provision trigger -----------------------
-- (The existing on_auth_user_created trigger keeps pointing at this function,
--  so replacing the body is enough — no need to recreate the trigger.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
    if new.email = 'pithi.deva@gmail.com' then
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

-- 3. Reliable profile registration -----------------------------------
-- Fixes: "new row violates row-level security policy for table users" when a
-- new Google user finishes Role Selection. This SECURITY DEFINER function
-- creates the caller's own profile server-side, so it works even if the
-- granular INSERT policy on public.users is missing or misconfigured. It is
-- still safe: it only ever inserts a row for auth.uid() (the verified caller)
-- and refuses to self-assign ADMIN unless the caller is the super admin.
create or replace function public.register_profile(p_role text)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
    v_id uuid := auth.uid();
    v_email text := auth.jwt() ->> 'email';
    v_name text := coalesce(
        auth.jwt() -> 'user_metadata' ->> 'full_name',
        nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1), ''),
        'User'
    );
    v_avatar text := auth.jwt() -> 'user_metadata' ->> 'avatar_url';
    v_role text := p_role;
    v_result public.users;
begin
    if v_id is null then
        raise exception 'Not authenticated';
    end if;

    -- The super admin is always ADMIN; nobody else may self-assign ADMIN.
    if v_email = 'pithi.deva@gmail.com' then
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

grant execute on function public.register_profile(text) to authenticated;

-- Defensive: make sure the basic self-insert / read policies exist too, in case
-- an earlier partial schema apply left them out.
drop policy if exists "Allow user insert own profile" on public.users;
create policy "Allow user insert own profile"
    on public.users for insert
    with check (auth.uid() = id);

drop policy if exists "Enable select for everyone" on public.users;
create policy "Enable select for everyone"
    on public.users for select
    using (true);

-- 4. One-time cleanup: demote any non-super-admin who already escalated
--    themselves to ADMIN through the old hole.
--    DISABLED BY DEFAULT — the production project has a legitimate admin
--    (sengtha@gmail.com) that this would wrongly demote. Uncomment only if you
--    specifically want to strip all admins except the super admin.
-- update public.users
--     set role = 'GENERAL_USER'
--     where role = 'ADMIN'
--       and email <> 'pithi.deva@gmail.com';
