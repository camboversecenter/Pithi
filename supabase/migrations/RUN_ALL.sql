-- ====================================================================
-- PITHI · RUN_ALL — every migration in dependency order, one paste.
-- ====================================================================
-- ⚠️  Double-check you are connected to the intended Supabase project before
--     running: this creates tables, policies and triggers.
-- Idempotent, non-destructive, and safe even on a partially-set-up DB.
-- ====================================================================


-- ####################################################################
-- ## SOURCE: 001_role_security.sql
-- ####################################################################

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
--    DISABLED BY DEFAULT — a deployment may have additional legitimate
--    administrators that this would wrongly demote. Uncomment only if you
--    specifically want to strip all admins except the super admin.
-- update public.users
--     set role = 'GENERAL_USER'
--     where role = 'ADMIN'
--       and email <> 'pithi.deva@gmail.com';


-- ####################################################################
-- ## SOURCE: 002_production_security.sql
-- ####################################################################

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
-- No existing admin is demoted. The hardcoded super-admin address here is
-- superseded by migration 006 (appended at the end of this file).
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


-- ####################################################################
-- ## SOURCE: 003_align_timestamp_columns.sql
-- ####################################################################

-- ====================================================================
-- MIGRATION 003 — Align timestamp columns with the app
-- ====================================================================
-- Root cause of "Could not find the 'createdAt' column of '<table>' in the
-- schema cache": the app writes camelCase createdAt/updatedAt/deletedAt, but
-- these tables only have snake_case created_at (or nothing). The app code was
-- updated to stop sending them, but cached PWA builds still do — so add the
-- columns to the database and every build (fresh or cached) works.
--
-- Idempotent and non-destructive. Adds the columns only if missing.
-- Existing rows get createdAt backfilled from created_at where that exists.
-- ====================================================================

do $$
declare
    t text;
    tables text[] := array[
        'ceremonies','services','bookings','booking_comments','booking_logs',
        'guests','invitation_templates','transactions','reported_transactions',
        'reviews','social_posts','post_comments','post_reactions','post_bookmarks'
    ];
    has_created_at boolean;
begin
    foreach t in array tables loop
        -- Skip tables that don't exist in this database.
        if not exists (
            select 1 from information_schema.tables
            where table_schema = 'public' and table_name = t
        ) then
            continue;
        end if;

        execute format('alter table public.%I add column if not exists "createdAt" timestamptz default now()', t);
        execute format('alter table public.%I add column if not exists "updatedAt" timestamptz default now()', t);
        execute format('alter table public.%I add column if not exists "deletedAt" timestamptz', t);

        -- Backfill createdAt from created_at for existing rows, if created_at exists.
        select exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = t and column_name = 'created_at'
        ) into has_created_at;

        if has_created_at then
            execute format('update public.%I set "createdAt" = created_at where "createdAt" is null and created_at is not null', t);
        end if;
    end loop;
end $$;


-- ####################################################################
-- ## SOURCE: 002_notifications.sql
-- ####################################################################

-- ====================================================================
-- MIGRATION 002 — In-app notifications
-- ====================================================================
-- Run this once in the Supabase SQL Editor on an existing PITHI database.
-- It is idempotent (safe to run more than once) and does NOT drop any data.
--
-- Adds a notifications inbox: a `notifications` table plus database
-- triggers that write a row for the affected user whenever
--   * a booking is created                      -> notify the provider
--   * a booking status changes                  -> notify the other party
--   * a booking comment is posted               -> notify the other party
--   * a guest accepts/declines an invitation    -> notify owner + organizer
--   * a review is left on a service             -> notify the provider
--   * a guest reports a gift transfer           -> notify owner + organizer
--
-- Clients may only READ / mark-as-read / delete their own notifications.
-- Rows are inserted exclusively by the SECURITY DEFINER trigger functions
-- below, so a user can never forge a notification for someone else.
-- ====================================================================

-- 1. Table -----------------------------------------------------------
create table if not exists public.notifications (
    id bigint primary key generated always as identity,
    "userId" uuid references public.users(id) on delete cascade not null,
    type text not null
        constraint check_notification_type check (type in (
            'BOOKING_CREATED', 'BOOKING_STATUS', 'BOOKING_COMMENT',
            'GUEST_RSVP', 'REVIEW', 'GIFT_REPORTED'
        )),
    title text not null,
    body text,
    link text,
    "isRead" boolean not null default false,
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);

create index if not exists idx_notifications_user_unread
    on public.notifications ("userId", "isRead")
    where "deletedAt" is null;

create index if not exists idx_notifications_user_created
    on public.notifications ("userId", "createdAt" desc);

-- 2. Row Level Security ----------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "Enable select own notifications" on public.notifications;
create policy "Enable select own notifications"
    on public.notifications for select
    using (auth.uid() = "userId");

-- Update is limited to the recipient (used to mark notifications read).
drop policy if exists "Enable update own notifications" on public.notifications;
create policy "Enable update own notifications"
    on public.notifications for update
    using (auth.uid() = "userId")
    with check (auth.uid() = "userId");

drop policy if exists "Enable delete own notifications" on public.notifications;
create policy "Enable delete own notifications"
    on public.notifications for delete
    using (auth.uid() = "userId");

-- No INSERT policy on purpose: only the trigger functions below (running
-- as the table owner) may create notifications.

-- 3. Shared insert helper --------------------------------------------
-- Never notifies the acting user about their own action, and silently
-- skips null recipients (e.g. a ceremony without an assigned owner).
create or replace function public.push_notification(
    p_user uuid, p_type text, p_title text, p_body text, p_link text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if p_user is null then
        return;
    end if;
    if auth.uid() is not null and p_user = auth.uid() then
        return;
    end if;
    insert into public.notifications ("userId", type, title, body, link)
    values (p_user, p_type, p_title, p_body, p_link);
end;
$$;

-- Clients must not call the helper directly — notifications are created
-- only as a side effect of real actions caught by the triggers below.
revoke execute on function public.push_notification(uuid, text, text, text, text) from public, anon, authenticated;

-- 4. Trigger functions ------------------------------------------------
-- New booking -> provider
create or replace function public.notify_on_booking_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_client text;
begin
    select name into v_client from public.users where id = new."bookedByUserId";
    perform public.push_notification(
        new."providerId",
        'BOOKING_CREATED',
        'មានការកក់សេវាកម្មថ្មី',
        coalesce(v_client, 'អតិថិជន') || ' បានកក់ « ' || new."serviceName"
            || ' » សម្រាប់ថ្ងៃទី ' || to_char(new.date, 'DD/MM/YYYY') || '។',
        '/booking/' || new.id
    );
    return new;
end;
$$;

drop trigger if exists trg_notify_on_booking_created on public.bookings;
create trigger trg_notify_on_booking_created
    after insert on public.bookings
    for each row execute function public.notify_on_booking_created();

-- Booking status change -> both parties (the actor is skipped by the helper)
create or replace function public.notify_on_booking_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_label text;
begin
    if new.status is distinct from old.status then
        v_label := case new.status
            when 'CONFIRMED' then 'ត្រូវបានបញ្ជាក់'
            when 'COMPLETED' then 'ត្រូវបានបញ្ចប់'
            when 'CANCELLED' then 'ត្រូវបានបោះបង់'
            else 'ត្រូវបានផ្លាស់ប្តូរស្ថានភាព'
        end;
        perform public.push_notification(
            new."bookedByUserId", 'BOOKING_STATUS',
            'ស្ថានភាពការកក់បានផ្លាស់ប្តូរ',
            'ការកក់ « ' || new."serviceName" || ' » ' || v_label || '។',
            '/booking/' || new.id
        );
        perform public.push_notification(
            new."providerId", 'BOOKING_STATUS',
            'ស្ថានភាពការកក់បានផ្លាស់ប្តូរ',
            'ការកក់ « ' || new."serviceName" || ' » ' || v_label || '។',
            '/booking/' || new.id
        );
    end if;
    return new;
end;
$$;

drop trigger if exists trg_notify_on_booking_status_change on public.bookings;
create trigger trg_notify_on_booking_status_change
    after update on public.bookings
    for each row execute function public.notify_on_booking_status_change();

-- Booking comment -> the other party of the booking
create or replace function public.notify_on_booking_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_booking public.bookings%rowtype;
    v_recipient uuid;
begin
    select * into v_booking from public.bookings where id = new."bookingId";
    if found then
        if new."userId" = v_booking."providerId" then
            v_recipient := v_booking."bookedByUserId";
        else
            v_recipient := v_booking."providerId";
        end if;
        perform public.push_notification(
            v_recipient, 'BOOKING_COMMENT',
            'មតិយោបល់ថ្មីលើការកក់',
            new."userName" || ' បានបញ្ចេញមតិលើ « ' || v_booking."serviceName" || ' »៖ '
                || left(new.content, 120),
            '/booking/' || v_booking.id
        );
    end if;
    return new;
end;
$$;

drop trigger if exists trg_notify_on_booking_comment on public.booking_comments;
create trigger trg_notify_on_booking_comment
    after insert on public.booking_comments
    for each row execute function public.notify_on_booking_comment();

-- Guest RSVP (accept/decline) -> ceremony owner and organizer
create or replace function public.notify_on_guest_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_ceremony public.ceremonies%rowtype;
    v_label text;
begin
    if new.status is distinct from old.status and new.status in ('ACCEPTED', 'DECLINED') then
        select * into v_ceremony from public.ceremonies where id = new."ceremonyId";
        if found then
            if new.status = 'ACCEPTED' then
                v_label := ' បានទទួលយកការអញ្ជើញចូលរួម « ';
            else
                v_label := ' បានបដិសេធការអញ្ជើញចូលរួម « ';
            end if;
            perform public.push_notification(
                v_ceremony."ownerId", 'GUEST_RSVP',
                'ការឆ្លើយតបនឹងការអញ្ជើញ',
                new.name || v_label || v_ceremony.title || ' »។',
                '/owner'
            );
            perform public.push_notification(
                v_ceremony."organizerId", 'GUEST_RSVP',
                'ការឆ្លើយតបនឹងការអញ្ជើញ',
                new.name || v_label || v_ceremony.title || ' »។',
                '/organizer'
            );
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_notify_on_guest_rsvp on public.guests;
create trigger trg_notify_on_guest_rsvp
    after update on public.guests
    for each row execute function public.notify_on_guest_rsvp();

-- New review -> service provider
create or replace function public.notify_on_review_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_provider uuid;
    v_service text;
begin
    select "providerId", name into v_provider, v_service
    from public.services where id = new."serviceId";
    perform public.push_notification(
        v_provider, 'REVIEW',
        'ការវាយតម្លៃថ្មីលើសេវាកម្មរបស់អ្នក',
        new."userName" || ' បានវាយតម្លៃ ' || new.rating || ' ផ្កាយ លើ « '
            || coalesce(v_service, 'សេវាកម្ម') || ' »។',
        '/vendor'
    );
    return new;
end;
$$;

drop trigger if exists trg_notify_on_review_created on public.reviews;
create trigger trg_notify_on_review_created
    after insert on public.reviews
    for each row execute function public.notify_on_review_created();

-- Guest-reported gift transfer -> ceremony owner and organizer
create or replace function public.notify_on_gift_reported()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_ceremony public.ceremonies%rowtype;
begin
    select * into v_ceremony from public.ceremonies where id = new."ceremonyId";
    if found then
        perform public.push_notification(
            v_ceremony."ownerId", 'GIFT_REPORTED',
            'មានការរាយការណ៍ចំណងដៃថ្មី',
            new."guestName" || ' បានរាយការណ៍ការផ្ទេរប្រាក់ចំនួន ' || new.amount || ' '
                || new.currency || ' សម្រាប់ « ' || v_ceremony.title || ' »។',
            '/owner'
        );
        perform public.push_notification(
            v_ceremony."organizerId", 'GIFT_REPORTED',
            'មានការរាយការណ៍ចំណងដៃថ្មី',
            new."guestName" || ' បានរាយការណ៍ការផ្ទេរប្រាក់ចំនួន ' || new.amount || ' '
                || new.currency || ' សម្រាប់ « ' || v_ceremony.title || ' »។',
            '/organizer'
        );
    end if;
    return new;
end;
$$;

drop trigger if exists trg_notify_on_gift_reported on public.reported_transactions;
create trigger trg_notify_on_gift_reported
    after insert on public.reported_transactions
    for each row execute function public.notify_on_gift_reported();

-- 5. Realtime ---------------------------------------------------------
-- Lets the client receive new notifications instantly over Supabase
-- Realtime (postgres_changes respects the RLS policies above, so users
-- only ever receive their own rows). Safe to skip on plain Postgres.
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'notifications'
    ) then
        alter publication supabase_realtime add table public.notifications;
    end if;
exception when undefined_object then
    null; -- no supabase_realtime publication on this database; realtime is optional
end;
$$;


-- ####################################################################
-- ## SOURCE: 003_booking_conflicts.sql
-- ####################################################################

-- ====================================================================
-- MIGRATION 003 — Double-booking protection
-- ====================================================================
-- Run this once in the Supabase SQL Editor on an existing PITHI database.
-- It is idempotent (safe to run more than once) and does NOT drop any data.
--
-- A vendor could previously CONFIRM two bookings for the same service with
-- overlapping times on the same day. This trigger rejects any booking that
-- would become CONFIRMED (insert, status change, or schedule change) while
-- another CONFIRMED booking of the same service overlaps it in time.
--
-- PENDING requests are still allowed to overlap on purpose: several clients
-- may request the same slot and the vendor picks which one to confirm.
-- ====================================================================

create or replace function public.enforce_booking_no_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Only bookings that are (becoming) CONFIRMED can conflict.
    if new.status <> 'CONFIRMED' or new."deletedAt" is not null then
        return new;
    end if;

    -- "startTime"/"endTime" are zero-padded HH:MM strings, so plain text
    -- comparison is chronological.
    if exists (
        select 1 from public.bookings b
        where b."serviceId" = new."serviceId"
          and b.id <> new.id
          and b.date = new.date
          and b.status = 'CONFIRMED'
          and b."deletedAt" is null
          and b."startTime" < new."endTime"
          and b."endTime" > new."startTime"
    ) then
        raise exception 'ម៉ោងនេះត្រូវបានកក់រួចហើយ។ សេវាកម្មនេះមានការកក់ដែលបានបញ្ជាក់ក្នុងម៉ោងជាន់គ្នានៅថ្ងៃដដែល។';
    end if;

    return new;
end;
$$;

drop trigger if exists trg_enforce_booking_no_overlap on public.bookings;
create trigger trg_enforce_booking_no_overlap
    before insert or update on public.bookings
    for each row execute function public.enforce_booking_no_overlap();


-- ####################################################################
-- ## SOURCE: 004_guest_checkin.sql
-- ####################################################################

-- ====================================================================
-- MIGRATION 004 — Guest check-in
-- ====================================================================
-- Run this once in the Supabase SQL Editor on an existing PITHI database.
-- It is idempotent (safe to run more than once) and does NOT drop any data.
--
-- Adds ceremony-day check-in: each guest's invitation carries a QR code and
-- the host scans it (or taps the guest in the list) at the entrance. The
-- timestamp lands in guests."checkedInAt".
--
-- No new policies are needed: the existing "Enable update of RSVPs" policy
-- already limits guest updates to the ceremony organizer/owner, the guest's
-- own linked account, and admins.
-- ====================================================================

alter table public.guests add column if not exists "checkedInAt" timestamptz;


-- ####################################################################
-- ## SOURCE: 005_messaging_bookings_rsvp.sql
-- ####################################################################

-- ====================================================================
-- MIGRATION 005 — Messaging, richer bookings, RSVP alerts, announcements
-- ====================================================================
-- Run this once in the Supabase SQL Editor on an existing PITHI database.
-- It is idempotent (safe to run more than once) and does NOT drop any data.
--
-- Adds:
--   * ceremonies."mapUrl"                     -> Google Maps link on invitations
--   * services."paymentQrUrl"/"depositPercent"/"unitLabel"
--                                             -> vendor deposit QR + per-unit pricing
--   * bookings.quantity/"unitPrice"           -> "30 tables × $200"
--   * booking_comments attachments            -> photos & voice notes in chat
--   * direct_messages                         -> owner ↔ vendor ↔ organizer chat
--   * announcements                           -> broadcast to guests / clients
--   * notification on a NEW guest RSVP        -> the owner hears about sign-ups
--                                                made through a shared link
-- ====================================================================

-- 1. Column additions -------------------------------------------------
alter table public.ceremonies add column if not exists "mapUrl" text;

alter table public.services add column if not exists "paymentQrUrl" text;
alter table public.services add column if not exists "depositPercent" numeric(5, 2) default 50;
alter table public.services add column if not exists "unitLabel" text;

alter table public.bookings add column if not exists quantity integer not null default 1;
alter table public.bookings add column if not exists "unitPrice" numeric(12, 2);

-- The client has always sent these two names with every booking, but the table
-- never had the columns — so every insert failed with "column bookedByUserName
-- does not exist" and no booking could be created at all. They also save a join
-- when showing who booked what.
alter table public.bookings add column if not exists "bookedByUserName" text;
alter table public.bookings add column if not exists "providerName" text;

-- The overlap trigger (migration 003) fires on every bookings UPDATE. These
-- backfills only touch name/price columns, so pause it to avoid tripping on
-- pre-existing overlapping bookings created before that trigger existed.
do $$
begin
    if exists (select 1 from pg_trigger where tgname = 'trg_enforce_booking_no_overlap' and tgrelid = 'public.bookings'::regclass) then
        execute 'alter table public.bookings disable trigger trg_enforce_booking_no_overlap';
    end if;
end $$;

update public.bookings b
set "bookedByUserName" = u.name
from public.users u
where u.id = b."bookedByUserId" and b."bookedByUserName" is null;

update public.bookings b
set "providerName" = u.name
from public.users u
where u.id = b."providerId" and b."providerName" is null;

alter table public.booking_comments add column if not exists "attachmentUrl" text;
alter table public.booking_comments add column if not exists "attachmentType" text;

-- Back-fill the unit price for rows created before quantities existed.
update public.bookings set "unitPrice" = price where "unitPrice" is null;

-- Re-enable the overlap trigger now that the backfill is finished.
do $$
begin
    if exists (select 1 from pg_trigger where tgname = 'trg_enforce_booking_no_overlap' and tgrelid = 'public.bookings'::regclass) then
        execute 'alter table public.bookings enable trigger trg_enforce_booking_no_overlap';
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'check_booking_quantity'
    ) then
        alter table public.bookings
            add constraint check_booking_quantity check (quantity >= 1);
    end if;
    if not exists (
        select 1 from pg_constraint where conname = 'check_comment_attachment_type'
    ) then
        alter table public.booking_comments
            add constraint check_comment_attachment_type
            check ("attachmentType" is null or "attachmentType" in ('IMAGE', 'AUDIO'));
    end if;
end;
$$;

-- booking_comments.content is NOT NULL, but a voice note or photo may carry no
-- text at all. Callers send an empty string in that case, so nothing to change
-- here — documented so the constraint is not mistaken for a bug.


-- 2. Notification types ----------------------------------------------
-- Widen the allowed set so message + announcement rows can be written.
alter table public.notifications drop constraint if exists check_notification_type;
alter table public.notifications
    add constraint check_notification_type check (type in (
        'BOOKING_CREATED', 'BOOKING_STATUS', 'BOOKING_COMMENT',
        'GUEST_RSVP', 'REVIEW', 'GIFT_REPORTED',
        'MESSAGE', 'ANNOUNCEMENT'
    ));


-- 3. direct_messages --------------------------------------------------
create table if not exists public.direct_messages (
    id bigint primary key generated always as identity,
    "senderId" uuid references public.users(id) on delete cascade not null,
    "senderName" text not null,
    "recipientId" uuid references public.users(id) on delete cascade not null,
    "recipientName" text not null,
    content text not null default '',
    "attachmentUrl" text,
    "attachmentType" text
        constraint check_message_attachment_type
        check ("attachmentType" is null or "attachmentType" in ('IMAGE', 'AUDIO')),
    "isRead" boolean not null default false,
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);

create index if not exists idx_direct_messages_pair
    on public.direct_messages ("senderId", "recipientId", "createdAt" desc);

create index if not exists idx_direct_messages_inbox
    on public.direct_messages ("recipientId", "isRead")
    where "deletedAt" is null;

alter table public.direct_messages enable row level security;

drop policy if exists "Enable select own conversations" on public.direct_messages;
create policy "Enable select own conversations"
    on public.direct_messages for select
    using (auth.uid() = "senderId" or auth.uid() = "recipientId");

drop policy if exists "Enable send messages as self" on public.direct_messages;
create policy "Enable send messages as self"
    on public.direct_messages for insert
    with check (auth.uid() = "senderId");

-- The recipient marks messages read; the sender may soft-delete their own.
drop policy if exists "Enable update own conversations" on public.direct_messages;
create policy "Enable update own conversations"
    on public.direct_messages for update
    using (auth.uid() = "senderId" or auth.uid() = "recipientId")
    with check (auth.uid() = "senderId" or auth.uid() = "recipientId");

drop policy if exists "Enable delete own messages" on public.direct_messages;
create policy "Enable delete own messages"
    on public.direct_messages for delete
    using (auth.uid() = "senderId");

create or replace function public.notify_on_direct_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_preview text;
begin
    v_preview := case
        when new."attachmentType" = 'IMAGE' then '📷 រូបភាព'
        when new."attachmentType" = 'AUDIO' then '🎤 សារជាសំឡេង'
        else left(new.content, 120)
    end;
    perform public.push_notification(
        new."recipientId", 'MESSAGE',
        'សារថ្មីពី ' || new."senderName",
        v_preview,
        '/messages?with=' || new."senderId"
    );
    return new;
end;
$$;

drop trigger if exists trg_notify_on_direct_message on public.direct_messages;
create trigger trg_notify_on_direct_message
    after insert on public.direct_messages
    for each row execute function public.notify_on_direct_message();

do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'direct_messages'
    ) then
        alter publication supabase_realtime add table public.direct_messages;
    end if;
exception when undefined_object then
    null; -- realtime is optional
end;
$$;


-- 4. announcements ----------------------------------------------------
-- An event owner/organizer broadcasts to the guests of one ceremony; a vendor
-- broadcasts to every client who booked them. Recipients receive the message
-- in their notification inbox.
create table if not exists public.announcements (
    id bigint primary key generated always as identity,
    "authorId" uuid references public.users(id) on delete cascade not null,
    "authorName" text not null,
    "authorRole" text not null,
    audience text not null
        constraint check_announcement_audience
        check (audience in ('CEREMONY_GUESTS', 'VENDOR_CLIENTS')),
    "ceremonyId" uuid references public.ceremonies(id) on delete cascade,
    title text not null,
    message text not null,
    "recipientCount" integer not null default 0,
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);

create index if not exists idx_announcements_author
    on public.announcements ("authorId", "createdAt" desc);

create index if not exists idx_announcements_ceremony
    on public.announcements ("ceremonyId", "createdAt" desc);

alter table public.announcements enable row level security;

-- Readable by the author, by the ceremony's planners, and by the people the
-- announcement was addressed to (guests of the ceremony / clients of the vendor).
drop policy if exists "Enable select announcements for participants" on public.announcements;
create policy "Enable select announcements for participants"
    on public.announcements for select
    using (
        auth.uid() = "authorId"
        or public.get_my_role() = 'ADMIN'
        or (
            audience = 'CEREMONY_GUESTS' and exists (
                select 1 from public.ceremonies c
                where c.id = "ceremonyId"
                  and (
                      c."organizerId" = auth.uid()
                      or c."ownerId" = auth.uid()
                      or exists (
                          select 1 from public.guests g
                          where g."ceremonyId" = c.id and g."userId" = auth.uid()
                      )
                  )
            )
        )
        or (
            audience = 'VENDOR_CLIENTS' and exists (
                select 1 from public.bookings b
                where b."providerId" = "authorId" and b."bookedByUserId" = auth.uid()
            )
        )
    );

-- Only a ceremony's planner may announce to its guests; only a provider may
-- announce to their own clients. Both must post under their own identity.
drop policy if exists "Enable insert announcements for hosts" on public.announcements;
create policy "Enable insert announcements for hosts"
    on public.announcements for insert
    with check (
        auth.uid() = "authorId"
        and (
            (audience = 'CEREMONY_GUESTS' and exists (
                select 1 from public.ceremonies c
                where c.id = "ceremonyId"
                  and (c."organizerId" = auth.uid() or c."ownerId" = auth.uid())
            ))
            or audience = 'VENDOR_CLIENTS'
        )
    );

drop policy if exists "Enable delete own announcements" on public.announcements;
create policy "Enable delete own announcements"
    on public.announcements for delete
    using (auth.uid() = "authorId" or public.get_my_role() = 'ADMIN');

create or replace function public.fanout_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_recipient uuid;
    v_count integer := 0;
    v_title text;
begin
    v_title := 'សេចក្តីជូនដំណឹងពី ' || new."authorName";

    if new.audience = 'CEREMONY_GUESTS' then
        for v_recipient in
            select distinct g."userId"
            from public.guests g
            where g."ceremonyId" = new."ceremonyId"
              and g."userId" is not null
              and g."userId" <> new."authorId"
        loop
            perform public.push_notification(
                v_recipient, 'ANNOUNCEMENT', v_title,
                new.title || ' — ' || left(new.message, 160),
                '/notifications'
            );
            v_count := v_count + 1;
        end loop;

        -- The other planner of the ceremony should see it too.
        for v_recipient in
            select unnest(array[c."ownerId", c."organizerId"])
            from public.ceremonies c where c.id = new."ceremonyId"
        loop
            if v_recipient is not null and v_recipient <> new."authorId" then
                perform public.push_notification(
                    v_recipient, 'ANNOUNCEMENT', v_title,
                    new.title || ' — ' || left(new.message, 160),
                    '/notifications'
                );
            end if;
        end loop;
    else
        for v_recipient in
            select distinct b."bookedByUserId"
            from public.bookings b
            where b."providerId" = new."authorId"
              and b.status in ('PENDING', 'CONFIRMED', 'COMPLETED')
              and b."bookedByUserId" <> new."authorId"
        loop
            perform public.push_notification(
                v_recipient, 'ANNOUNCEMENT', v_title,
                new.title || ' — ' || left(new.message, 160),
                '/notifications'
            );
            v_count := v_count + 1;
        end loop;
    end if;

    update public.announcements set "recipientCount" = v_count where id = new.id;
    return new;
end;
$$;

drop trigger if exists trg_fanout_announcement on public.announcements;
create trigger trg_fanout_announcement
    after insert on public.announcements
    for each row execute function public.fanout_announcement();


-- 5. RSVP arrivals ----------------------------------------------------
-- A guest who opens a shared invitation link is INSERTed, never UPDATEd, so the
-- existing update-only trigger stayed silent and the owner never learned that
-- somebody had signed up. This covers the insert path.
create or replace function public.notify_on_guest_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_ceremony public.ceremonies%rowtype;
    v_body text;
begin
    if new.status <> 'ACCEPTED' then
        return new; -- a planner adding a name to the list is not an RSVP
    end if;

    select * into v_ceremony from public.ceremonies where id = new."ceremonyId";
    if found then
        v_body := new.name
            || coalesce(' (' || nullif(new."phoneNumber", '') || ')', '')
            || ' បានបញ្ជាក់ការចូលរួម « ' || v_ceremony.title || ' »។';
        perform public.push_notification(
            v_ceremony."ownerId", 'GUEST_RSVP',
            'ភ្ញៀវថ្មីបានឆ្លើយតបការអញ្ជើញ', v_body,
            '/owner?ceremonyId=' || v_ceremony.id
        );
        perform public.push_notification(
            v_ceremony."organizerId", 'GUEST_RSVP',
            'ភ្ញៀវថ្មីបានឆ្លើយតបការអញ្ជើញ', v_body,
            '/organizer?ceremonyId=' || v_ceremony.id
        );
    end if;
    return new;
end;
$$;

drop trigger if exists trg_notify_on_guest_added on public.guests;
create trigger trg_notify_on_guest_added
    after insert on public.guests
    for each row execute function public.notify_on_guest_added();


-- 6. PUBLIC INVITATION ACCESS ----------------------------------------
-- A guest opening a shared link is not signed in, so RLS blocks them from
-- reading the ceremony and from inserting their own guest row — which is why
-- the whole link flow silently did nothing. These two SECURITY DEFINER
-- functions expose exactly what an invitation needs and nothing more.
create or replace function public.get_public_invitation(p_ceremony uuid)
returns table (
    id uuid, title text, type text, date date, description text,
    location text, "mapUrl" text, "bannerUrl" text,
    "invitationMessage" text, "themeColor" text, "khqrUrl" text
)
language sql
stable
security definer
set search_path = public
as $$
    select c.id, c.title, c.type, c.date, c.description,
           c.location, c."mapUrl", c."bannerUrl",
           c."invitationMessage", c."themeColor", c."khqrUrl"
    from public.ceremonies c
    where c.id = p_ceremony and c."deletedAt" is null;
$$;

grant execute on function public.get_public_invitation(uuid) to anon, authenticated;

create or replace function public.rsvp_to_ceremony(
    p_ceremony uuid, p_name text, p_phone text, p_guest_type text
)
returns public.guests
language plpgsql
security definer
set search_path = public
as $$
declare
    v_ceremony public.ceremonies%rowtype;
    v_guest public.guests%rowtype;
    v_name text := btrim(coalesce(p_name, ''));
    v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
begin
    if length(v_name) < 2 then
        raise exception 'សូមបញ្ចូលឈ្មោះឱ្យបានត្រឹមត្រូវ។';
    end if;

    select * into v_ceremony from public.ceremonies where id = p_ceremony and "deletedAt" is null;
    if not found then
        raise exception 'រកមិនឃើញកម្មវិធីនេះទេ។';
    end if;
    if v_ceremony.date < current_date then
        raise exception 'ការអញ្ជើញបានផុតកំណត់ហើយ។';
    end if;

    -- Tapping the link twice must not create two guests in the host's list.
    select * into v_guest from public.guests
    where "ceremonyId" = p_ceremony
      and lower(name) = lower(v_name)
      and coalesce("phoneNumber", '') = coalesce(v_phone, '')
    limit 1;

    if found then
        update public.guests
        set status = 'ACCEPTED', "updatedAt" = now()
        where id = v_guest.id
        returning * into v_guest;
        return v_guest;
    end if;

    insert into public.guests ("ceremonyId", "userId", name, "phoneNumber", status, "guestType")
    values (
        p_ceremony, auth.uid(), v_name, v_phone, 'ACCEPTED',
        coalesce(nullif(btrim(coalesce(p_guest_type, '')), ''), 'General')
    )
    returning * into v_guest;

    return v_guest;
end;
$$;

grant execute on function public.rsvp_to_ceremony(uuid, text, text, text) to anon, authenticated;


-- ####################################################################
-- ## SOURCE: 006_configurable_super_admin.sql
-- ####################################################################

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
