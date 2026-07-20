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
