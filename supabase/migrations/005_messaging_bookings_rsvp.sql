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
