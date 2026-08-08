-- ====================================================================
-- MIGRATION 002 — Production security hardening
-- ====================================================================
-- Idempotent and non-destructive — safe to run more than once. Running it brings any PITHI
-- database to the same secured state:
--   * get_my_role() helper
--   * register_profile() reliable registration RPC (authenticated only)
--   * enforce_user_role_integrity() guard against ADMIN self-promotion
--   * Row-Level Security enabled + policies on the 4 social tables
--   * search_path pinned on the older helper functions (linter warnings)
-- No existing admin is demoted. NOTE: migration 006 supersedes the hardcoded
-- super-admin address used here with a configurable one.
-- ====================================================================

-- 1. Helper: securely fetch the caller's role (used by RLS policies) --
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select role from public.users where id = auth.uid();
$$;

-- 2. Role integrity guard (blocks anon-key self-promotion to ADMIN) ---
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

-- 3. Reliable profile registration RPC --------------------------------
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

-- Lock down the SECURITY DEFINER functions to the right callers.
revoke execute on function public.enforce_user_role_integrity() from public, anon, authenticated;
revoke execute on function public.register_profile(text) from public, anon;
grant execute on function public.register_profile(text) to authenticated;

-- 4. Social feed: enable RLS + policies -------------------------------
drop policy if exists "Enable select posts for all" on public.social_posts;
create policy "Enable select posts for all" on public.social_posts for select using (true);
drop policy if exists "Enable select reactions for all" on public.post_reactions;
create policy "Enable select reactions for all" on public.post_reactions for select using (true);
drop policy if exists "Enable select bookmarks for all" on public.post_bookmarks;
create policy "Enable select bookmarks for all" on public.post_bookmarks for select using (true);
drop policy if exists "Enable select comments for all" on public.post_comments;
create policy "Enable select comments for all" on public.post_comments for select using (true);

drop policy if exists "Enable insert posts for logged-in users" on public.social_posts;
create policy "Enable insert posts for logged-in users"
    on public.social_posts for insert with check (auth.uid() = "authorId");
drop policy if exists "Enable insert reactions for logged-in users" on public.post_reactions;
create policy "Enable insert reactions for logged-in users"
    on public.post_reactions for insert with check (auth.uid() = "userId");
drop policy if exists "Enable insert bookmarks for logged-in users" on public.post_bookmarks;
create policy "Enable insert bookmarks for logged-in users"
    on public.post_bookmarks for insert with check (auth.uid() = "userId");
drop policy if exists "Enable insert comments for logged-in users" on public.post_comments;
create policy "Enable insert comments for logged-in users"
    on public.post_comments for insert with check (auth.uid() = "authorId");

drop policy if exists "Enable modify posts for authors or admins" on public.social_posts;
create policy "Enable modify posts for authors or admins"
    on public.social_posts for update
    using (auth.uid() = "authorId" or public.get_my_role() = 'ADMIN')
    with check (auth.uid() = "authorId" or public.get_my_role() = 'ADMIN');
drop policy if exists "Enable delete posts for authors or admins" on public.social_posts;
create policy "Enable delete posts for authors or admins"
    on public.social_posts for delete
    using (auth.uid() = "authorId" or public.get_my_role() = 'ADMIN');

drop policy if exists "Enable modify reactions for owners" on public.post_reactions;
create policy "Enable modify reactions for owners"
    on public.post_reactions for update
    using (auth.uid() = "userId") with check (auth.uid() = "userId");
drop policy if exists "Enable delete reactions for owners" on public.post_reactions;
create policy "Enable delete reactions for owners"
    on public.post_reactions for delete using (auth.uid() = "userId");

drop policy if exists "Enable modify bookmarks for owners" on public.post_bookmarks;
create policy "Enable modify bookmarks for owners"
    on public.post_bookmarks for update
    using (auth.uid() = "userId") with check (auth.uid() = "userId");
drop policy if exists "Enable delete bookmarks for owners" on public.post_bookmarks;
create policy "Enable delete bookmarks for owners"
    on public.post_bookmarks for delete using (auth.uid() = "userId");

drop policy if exists "Enable modify comments for owners or admins" on public.post_comments;
create policy "Enable modify comments for owners or admins"
    on public.post_comments for update
    using (auth.uid() = "authorId" or public.get_my_role() = 'ADMIN')
    with check (auth.uid() = "authorId" or public.get_my_role() = 'ADMIN');
drop policy if exists "Enable delete comments for owners or admins" on public.post_comments;
create policy "Enable delete comments for owners or admins"
    on public.post_comments for delete
    using (auth.uid() = "authorId" or public.get_my_role() = 'ADMIN');

alter table public.social_posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_bookmarks enable row level security;
alter table public.post_comments enable row level security;

-- 5. Pin search_path on the older helper functions (linter warnings) --
-- Purely cosmetic (silences linter warnings). These helpers may be absent or
-- have a different signature on some databases, so each ALTER swallows
-- "undefined_function" and can never block the migration.
do $$
begin
    begin execute 'alter function public.increment_post_stat(bigint, text) set search_path = public';
    exception when undefined_function then null; end;

    begin execute 'alter function public.decrement_post_stat(bigint, text) set search_path = public';
    exception when undefined_function then null; end;

    begin execute 'alter function public.touch_updated_at() set search_path = public';
    exception when undefined_function then null; end;
end $$;

-- 6. (OPTIONAL) Stop the public PITHI bucket from allowing file listing.
-- Public object URLs keep working without this policy; it only removes the
-- ability to LIST every filename via the API. Uncomment to apply — verify your
-- images still load afterwards (the app uses direct public URLs, so they will).
-- drop policy if exists "Public Access" on storage.objects;
