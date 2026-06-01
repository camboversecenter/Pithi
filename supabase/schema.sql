-- ====================================================================
-- PITHI - SUPABASE DATABASE SCHEMA AND ROLE-BASED ACCESS CONTROL (RBAC)
-- ====================================================================
-- This file defines the full schema, custom utility functions,
-- triggered auto-registrations, and custom Row Level Security (RLS)
-- policies matching the user role definitions as requested.
--
-- Supported UserRoles:
--   'GENERAL_USER' (Can edit own profile, RSVP to invitations, and act as ceremony Owner)
--   'ORGANIZER'    (Can create ceremonies, create invitation templates, create bookings)
--   'CHEF', 'HALL', 'MUSIC_BAND', 'BEAUTY_SALON' (Service providers)
--   'ADMIN'        (Super Administrator with unlimited access)
-- ====================================================================

-- 1. SETUP EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. CREATE USER ENUM & ROLES TYPE
-- Handled as TEXT check constraints to map cleanly with standard JS string enums.

-- 3. TABLE DEFINITIONS
-- --------------------------------------------------------------------
-- users (Public profiles synced with auth.users)
-- --------------------------------------------------------------------
create table if not exists public.users (
    id uuid references auth.users on delete cascade primary key,
    name text not null,
    email text not null,
    role text not null default 'GENERAL_USER' 
        constraint check_user_role check (role in (
            'GENERAL_USER', 'ORGANIZER', 'CHEF', 'HALL', 'MUSIC_BAND', 'BEAUTY_SALON', 'ADMIN'
        )),
    "avatarUrl" text,
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz,
    constraint unique_user_email unique (email)
);

-- --------------------------------------------------------------------
-- ceremonies (Weddings, birthdays, etc., assigned to organizers & owners)
-- --------------------------------------------------------------------
create table if not exists public.ceremonies (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    type text not null,
    date date not null,
    description text,
    "organizerId" uuid references public.users(id) on delete set null,
    "ownerId" uuid references public.users(id) on delete set null,
    location text,
    budget numeric(12, 2) default 0.00,
    "invitationMessage" text,
    "themeColor" text,
    "khqrUrl" text,
    "bannerUrl" text,
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);

-- --------------------------------------------------------------------
-- services (Marketplace services offered by providers)
-- --------------------------------------------------------------------
create table if not exists public.services (
    id bigint primary key generated always as identity,
    "providerId" uuid references public.users(id) on delete cascade not null,
    "providerName" text not null,
    role text not null
        constraint check_service_role check (role in (
            'CHEF', 'HALL', 'MUSIC_BAND', 'BEAUTY_SALON', 'ORGANIZER'
        )),
    name text not null,
    description text,
    price numeric(12, 2) not null,
    "priceNote" text,
    location text not null,
    "locationType" text default 'FIXED' constraint check_location_type check ("locationType" in ('FIXED', 'FLEXIBLE')),
    "mapUrl" text,
    "imageUrl" text,
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);

-- --------------------------------------------------------------------
-- bookings (Service reservations for ceremonies)
-- --------------------------------------------------------------------
create table if not exists public.bookings (
    id bigint primary key generated always as identity,
    "serviceId" bigint references public.services(id) on delete cascade not null,
    "ceremonyId" uuid references public.ceremonies(id) on delete cascade not null,
    "bookedByUserId" uuid references public.users(id) on delete set null not null,
    "providerId" uuid references public.users(id) on delete set null not null,
    date date not null,
    "startTime" text not null,
    "endTime" text not null,
    status text not null default 'PENDING'
        constraint check_booking_status check (status in ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
    "serviceName" text not null,
    price numeric(12, 2) not null,
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);

-- --------------------------------------------------------------------
-- booking_comments (Communication history between client and provider)
-- --------------------------------------------------------------------
create table if not exists public.booking_comments (
    id bigint primary key generated always as identity,
    "bookingId" bigint references public.bookings(id) on delete cascade not null,
    "userId" uuid references public.users(id) on delete set null not null,
    "userName" text not null,
    role text not null,
    content text not null,
    timestamp timestamptz default now(),
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);

-- --------------------------------------------------------------------
-- booking_logs (Activity logging for audit/updates)
-- --------------------------------------------------------------------
create table if not exists public.booking_logs (
    id bigint primary key generated always as identity,
    "bookingId" bigint references public.bookings(id) on delete cascade not null,
    action text not null,
    details text not null,
    "userId" uuid references public.users(id) on delete set null not null,
    "userName" text not null,
    timestamp timestamptz default now(),
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);

-- --------------------------------------------------------------------
-- guests (RSVP Tracker for ceremonies)
-- --------------------------------------------------------------------
create table if not exists public.guests (
    id bigint primary key generated always as identity,
    "ceremonyId" uuid references public.ceremonies(id) on delete cascade not null,
    "userId" uuid references public.users(id) on delete set null,
    name text not null,
    "phoneNumber" text,
    status text not null default 'PENDING'
        constraint check_guest_status check (status in ('PENDING', 'ACCEPTED', 'DECLINED')),
    "guestType" text,
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);

-- --------------------------------------------------------------------
-- invitation_templates (Custom descriptions & banner layouts of RSVP invitations)
-- --------------------------------------------------------------------
create table if not exists public.invitation_templates (
    id bigint primary key generated always as identity,
    "ceremonyId" uuid references public.ceremonies(id) on delete cascade not null,
    type text not null,
    message text not null,
    "bannerUrl" text,
    "expirationDate" date,
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);

-- --------------------------------------------------------------------
-- transactions (Internal budgets / expense tracking of the ceremony)
-- --------------------------------------------------------------------
create table if not exists public.transactions (
    id bigint primary key generated always as identity,
    "ceremonyId" uuid references public.ceremonies(id) on delete cascade not null,
    "donorName" text,
    "expenseName" text,
    category text,
    amount numeric(12, 2) not null,
    "giftDescription" text,
    type text not null
        constraint check_transaction_type check (type in ('INCOME', 'EXPENSE', 'GIFT')),
    date date not null default current_date,
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);

-- --------------------------------------------------------------------
-- reported_transactions (Transfers / gifts reported directly by guests)
-- --------------------------------------------------------------------
create table if not exists public.reported_transactions (
    id bigint primary key generated always as identity,
    "ceremonyId" uuid references public.ceremonies(id) on delete cascade not null,
    "guestId" bigint references public.guests(id) on delete set null,
    "guestName" text not null,
    amount numeric(12, 2) not null,
    currency text not null default 'USD' constraint check_report_currency check (currency in ('USD', 'KHR')),
    date date not null,
    "senderNameFromReceipt" text,
    "receiptImageUrl" text not null,
    status text not null default 'PENDING'
        constraint check_report_status check (status in ('PENDING', 'CONFIRMED')),
    timestamp timestamptz default now(),
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);

-- --------------------------------------------------------------------
-- reviews (Feedback on specific marketplace services)
-- --------------------------------------------------------------------
create table if not exists public.reviews (
    id bigint primary key generated always as identity,
    "serviceId" bigint references public.services(id) on delete cascade not null,
    "userId" uuid references public.users(id) on delete set null not null,
    "userName" text not null,
    rating integer not null constraint check_rating check (rating >= 1 and rating <= 5),
    comment text not null,
    date date not null default current_date,
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);

-- --------------------------------------------------------------------
-- social_posts (Knowledge feed details)
-- --------------------------------------------------------------------
create table if not exists public.social_posts (
    id bigint primary key generated always as identity,
    "authorId" uuid references public.users(id) on delete cascade not null,
    "authorName" text not null,
    "authorRole" text not null,
    title text not null,
    content text not null,
    likes integer not null default 0,
    useful integer not null default 0,
    fakes integer not null default 0,
    "bookmarksCount" integer not null default 0,
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);

-- --------------------------------------------------------------------
-- post_reactions (Likes, useful tags, fake warnings)
-- --------------------------------------------------------------------
create table if not exists public.post_reactions (
    id bigint primary key generated always as identity,
    "postId" bigint references public.social_posts(id) on delete cascade not null,
    "userId" uuid references public.users(id) on delete cascade not null,
    "reactionType" text not null constraint check_reaction_type check ("reactionType" in ('LIKE', 'USEFUL', 'FAKE')),
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz,
    constraint unique_post_user_reaction unique ("postId", "userId")
);

-- --------------------------------------------------------------------
-- post_bookmarks (Saved posts bookmarks)
-- --------------------------------------------------------------------
create table if not exists public.post_bookmarks (
    id bigint primary key generated always as identity,
    "postId" bigint references public.social_posts(id) on delete cascade not null,
    "userId" uuid references public.users(id) on delete cascade not null,
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz,
    constraint unique_post_user_bookmark unique ("postId", "userId")
);

-- --------------------------------------------------------------------
-- post_comments (Knowledge feed article conversations)
-- --------------------------------------------------------------------
create table if not exists public.post_comments (
    id bigint primary key generated always as identity,
    "postId" bigint references public.social_posts(id) on delete cascade not null,
    "authorId" uuid references public.users(id) on delete cascade not null,
    "authorName" text not null,
    content text not null,
    "createdAt" timestamptz default now(),
    "updatedAt" timestamptz default now(),
    "deletedAt" timestamptz
);


-- 4. UTILITY HELPER FUNCTIONS (FOR ATOMIC OPERATIONS)
-- --------------------------------------------------------------------
-- Increments/decrements statistic fields on posts atomically.
-- --------------------------------------------------------------------
create or replace function public.increment_post_stat(post_id bigint, col_name text)
returns void
language plpgsql
security definer
as $$
begin
    if col_name = 'likes' then
        update public.social_posts set likes = likes + 1 where id = post_id;
    elsif col_name = 'useful' then
        update public.social_posts set useful = useful + 1 where id = post_id;
    elsif col_name = 'fakes' then
        update public.social_posts set fakes = fakes + 1 where id = post_id;
    elsif col_name = 'bookmarksCount' then
        update public.social_posts set "bookmarksCount" = "bookmarksCount" + 1 where id = post_id;
    end if;
end;
$$;

create or replace function public.decrement_post_stat(post_id bigint, col_name text)
returns void
language plpgsql
security definer
as $$
begin
    if col_name = 'likes' then
        update public.social_posts set likes = greatest(0, likes - 1) where id = post_id;
    elsif col_name = 'useful' then
        update public.social_posts set useful = greatest(0, useful - 1) where id = post_id;
    elsif col_name = 'fakes' then
        update public.social_posts set fakes = greatest(0, fakes - 1) where id = post_id;
    elsif col_name = 'bookmarksCount' then
        update public.social_posts set "bookmarksCount" = greatest(0, "bookmarksCount" - 1) where id = post_id;
    end if;
end;
$$;


-- 5. SECURE HELPER FUNCTION FOR POLICY CHECKS
-- --------------------------------------------------------------------
-- Fetches the UserRole of the authenticated user securely.
-- Employs caching metadata techniques to avoid infinite recursive queries.
-- --------------------------------------------------------------------
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select role from public.users where id = auth.uid();
$$;


-- 6. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- --------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.ceremonies enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_comments enable row level security;
alter table public.booking_logs enable row level security;
alter table public.guests enable row level security;
alter table public.invitation_templates enable row level security;
alter table public.transactions enable row level security;
alter table public.reported_transactions enable row level security;
alter table public.reviews enable row level security;
alter table public.social_posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_bookmarks enable row level security;
alter table public.post_comments enable row level security;


-- 7. DEFINE SPECIFIC ROW LEVEL SECURITY POLICIES (RBAC)
-- ====================================================================

-- --------------------------------------------------------------------
-- users TABLE POLICIES
-- --------------------------------------------------------------------
-- Reading profiles: Allow all users to read active provider/client profiles.
create policy "Enable select for everyone"
    on public.users for select
    using (true);

-- Adding profiles: Allowed if adding your own profile upon signup.
create policy "Allow user insert own profile"
    on public.users for insert
    with check (auth.uid() = id);

-- Updating profiles: Users can update their own data, or admins can update anyone.
create policy "Allow user self-update or admin-update"
    on public.users for update
    using (auth.uid() = id or public.get_my_role() = 'ADMIN')
    with check (auth.uid() = id or public.get_my_role() = 'ADMIN');

-- Deleting profiles: Admin only can delete users.
create policy "Allow admin delete profiles"
    on public.users for delete
    using (public.get_my_role() = 'ADMIN');


-- --------------------------------------------------------------------
-- ceremonies TABLE POLICIES
-- --------------------------------------------------------------------
-- Reading ceremonies: Readable by Organizer/Owner of the ceremony OR anyone who has been registered as a guest to this ceremony.
create policy "Enable select access for associated accounts"
    on public.ceremonies for select
    using (
        auth.uid() = "organizerId" 
        or auth.uid() = "ownerId" 
        or public.get_my_role() = 'ADMIN'
        or exists (select 1 from public.guests where guests."ceremonyId" = ceremonies.id and guests."userId" = auth.uid())
    );

-- Creating ceremonies: Organizers or General Users can insert.
create policy "Enable insert for organizers and general users"
    on public.ceremonies for insert
    with check (
        public.get_my_role() in ('ORGANIZER', 'GENERAL_USER', 'ADMIN') 
        and (auth.uid() = "organizerId" or auth.uid() = "ownerId")
    );

-- Updating ceremonies: Restricted to creators and owners.
create policy "Enable update for owners and organizers"
    on public.ceremonies for update
    using (auth.uid() = "organizerId" or auth.uid() = "ownerId" or public.get_my_role() = 'ADMIN')
    with check (auth.uid() = "organizerId" or auth.uid() = "ownerId" or public.get_my_role() = 'ADMIN');

-- Deleting ceremonies: Organizer or Administrator only.
create policy "Enable delete for organizers and admins"
    on public.ceremonies for delete
    using (auth.uid() = "organizerId" or public.get_my_role() = 'ADMIN');


-- --------------------------------------------------------------------
-- services TABLE POLICIES
-- --------------------------------------------------------------------
-- Reading services: Publicly visible in marketplace.
create policy "Enable select access for everyone in directory"
    on public.services for select
    using (true);

-- Creating services: Only accessible for designated providers of that category.
create policy "Enable insert for eligible providers"
    on public.services for insert
    with check (
        (public.get_my_role() in ('CHEF', 'HALL', 'MUSIC_BAND', 'BEAUTY_SALON', 'ORGANIZER', 'ADMIN'))
        and auth.uid() = "providerId"
    );

-- Updating services: Only the creator provider or admin.
create policy "Enable update for service owners or admins"
    on public.services for update
    using (auth.uid() = "providerId" or public.get_my_role() = 'ADMIN')
    with check (auth.uid() = "providerId" or public.get_my_role() = 'ADMIN');

-- Deleting services: Only the creator provider or admin.
create policy "Enable delete for service owners or admins"
    on public.services for delete
    using (auth.uid() = "providerId" or public.get_my_role() = 'ADMIN');


-- --------------------------------------------------------------------
-- bookings TABLE POLICIES
-- --------------------------------------------------------------------
-- Reading reservations: Clients, providers, or admins can view.
create policy "Enable select for clients, providers, or admins"
    on public.bookings for select
    using (auth.uid() = "bookedByUserId" or auth.uid() = "providerId" or public.get_my_role() = 'ADMIN');

-- Creating reservations: Clients or Organizers.
create policy "Enable insert for clients or organizers"
    on public.bookings for insert
    with check (
        (public.get_my_role() in ('GENERAL_USER', 'ORGANIZER', 'ADMIN'))
        and auth.uid() = "bookedByUserId"
    );

-- Updating reservations: Clients can update details or cancel, provider can update status.
create policy "Enable update for booking parties"
    on public.bookings for update
    using (auth.uid() = "bookedByUserId" or auth.uid() = "providerId" or public.get_my_role() = 'ADMIN')
    with check (auth.uid() = "bookedByUserId" or auth.uid() = "providerId" or public.get_my_role() = 'ADMIN');

-- Deleting reservations: Creator, provider or Admin.
create policy "Enable delete for booking parties"
    on public.bookings for delete
    using (auth.uid() = "bookedByUserId" or auth.uid() = "providerId" or public.get_my_role() = 'ADMIN');


-- --------------------------------------------------------------------
-- booking_comments & booking_logs TABLE POLICIES
-- --------------------------------------------------------------------
-- Comments: Must be part of the booking.
create policy "Enable read booking contents for participating users"
    on public.booking_comments for select
    using (
        exists (
            select 1 from public.bookings 
            where bookings.id = "bookingId" 
            and (bookings."bookedByUserId" = auth.uid() or bookings."providerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
    );

create policy "Enable insert booking comments for participating users"
    on public.booking_comments for insert
    with check (
        (auth.uid() = "userId")
        and exists (
            select 1 from public.bookings 
            where bookings.id = "bookingId" 
            and (bookings."bookedByUserId" = auth.uid() or bookings."providerId" = auth.uid())
        )
    );

-- Logs: Read-only audits for users in that booking.
create policy "Enable read logs for booking parties"
    on public.booking_logs for select
    using (
        exists (
            select 1 from public.bookings 
            where bookings.id = "bookingId" 
            and (bookings."bookedByUserId" = auth.uid() or bookings."providerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
    );

-- Logs: System is allowed to write them (Client inserts are done on behalf of actions).
create policy "Enable write logs for authorized actions"
    on public.booking_logs for insert
    with check (
        exists (
            select 1 from public.bookings 
            where bookings.id = "bookingId" 
            and (bookings."bookedByUserId" = auth.uid() or bookings."providerId" = auth.uid())
        )
    );


-- --------------------------------------------------------------------
-- guests TABLE POLICIES
-- --------------------------------------------------------------------
-- Reading guests: Public allowed (for RSVP verification / list) or restricted to ceremony owners/guests.
create policy "Enable select for RSVP verification"
    on public.guests for select
    using (true);

-- Adding RSVPs: Allowed for organizers/owners, or individual self-assigned logins.
create policy "Enable insert of RSVPs"
    on public.guests for insert
    with check (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or auth.uid() = "userId"
        or public.get_my_role() = 'ADMIN'
    );

-- Updating RSVPs: Assigned user or Ceremony coordinators.
create policy "Enable update of RSVPs"
    on public.guests for update
    using (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or auth.uid() = "userId"
        or public.get_my_role() = 'ADMIN'
    )
    with check (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or auth.uid() = "userId"
        or public.get_my_role() = 'ADMIN'
    );

-- Deleting RSVPs: Organizers/owners or admins only.
create policy "Enable delete of RSVPs"
    on public.guests for delete
    using (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
    );


-- --------------------------------------------------------------------
-- invitation_templates TABLE POLICIES
-- --------------------------------------------------------------------
-- Reading templates: Public readable (invited guests need access to templates to see layout page).
create policy "Enable select templates for everyone"
    on public.invitation_templates for select
    using (true);

-- Altering templates: Organizer or Ceremony owner.
create policy "Enable editing templates for managers"
    on public.invitation_templates for insert
    with check (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
    );

create policy "Enable update templates for managers"
    on public.invitation_templates for update
    using (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
    )
    with check (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
    );

create policy "Enable delete templates for managers"
    on public.invitation_templates for delete
    using (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
    );


-- --------------------------------------------------------------------
-- transactions & reported_transactions TABLE POLICIES
-- --------------------------------------------------------------------
-- Budget transactions: Visible only to ceremony organizer, owner, or admins.
create policy "Enable transaction select for ceremony planners"
    on public.transactions for select
    using (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
    );

create policy "Enable transaction modify for ceremony planners"
    on public.transactions for insert
    with check (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
    );

create policy "Enable transaction update for ceremony planners"
    on public.transactions for update
    using (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
    );

create policy "Enable transaction delete for ceremony planners"
    on public.transactions for delete
    using (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
    );

-- Reported transactions (Transfers reported by guests):
-- Select: Ceremony organizers, owners, admins, or the user who reported it.
create policy "Enable select for reports"
    on public.reported_transactions for select
    using (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
        or exists (select 1 from public.guests where guests.id = "guestId" and guests."userId" = auth.uid())
    );

-- Insert: Invited guests can submit new transaction reports.
create policy "Enable insert reports for invited guests"
    on public.reported_transactions for insert
    with check (
        exists (
            select 1 from public.guests 
            where guests.id = "guestId" 
            and (guests."userId" = auth.uid() or guests.name = "guestName")
        )
        or exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
    );

-- Update: Planners (Confirm/Reject reports) or admin.
create policy "Enable updates for reports by planners"
    on public.reported_transactions for update
    using (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
    );

-- Delete: Planners or admin.
create policy "Enable deletes for reports by planners"
    on public.reported_transactions for delete
    using (
        exists (
            select 1 from public.ceremonies 
            where ceremonies.id = "ceremonyId" 
            and (ceremonies."organizerId" = auth.uid() or ceremonies."ownerId" = auth.uid())
        )
        or public.get_my_role() = 'ADMIN'
    );


-- --------------------------------------------------------------------
-- reviews TABLE POLICIES
-- --------------------------------------------------------------------
-- Reviews: Public selection.
create policy "Enable review reading"
    on public.reviews for select
    using (true);

-- Adding review: Authenticated users.
create policy "Enable reviews insert for authenticated"
    on public.reviews for insert
    with check (auth.uid() = "userId");

-- Amending/deleting review: Reviewer or Admin.
create policy "Enable reviews delete or update for author or admin"
    on public.reviews for update
    using (auth.uid() = "userId" or public.get_my_role() = 'ADMIN')
    with check (auth.uid() = "userId" or public.get_my_role() = 'ADMIN');

create policy "Enable reviews delete for author or admin"
    on public.reviews for delete
    using (auth.uid() = "userId" or public.get_my_role() = 'ADMIN');


-- --------------------------------------------------------------------
-- SOCIAL FEED POLICIES (social_posts, post_reactions, post_bookmarks, post_comments)
-- --------------------------------------------------------------------
-- Read access: All authorized users can read posts, reactions, bookmarks, and comments.
create policy "Enable select posts for all" on public.social_posts for select using (true);
create policy "Enable select reactions for all" on public.post_reactions for select using (true);
create policy "Enable select bookmarks for all" on public.post_bookmarks for select using (true);
create policy "Enable select comments for all" on public.post_comments for select using (true);

-- Insert access: Authenticated users can create post records.
create policy "Enable insert posts for logged-in users" 
    on public.social_posts for insert with check (auth.uid() = "authorId");

create policy "Enable insert reactions for logged-in users" 
    on public.post_reactions for insert with check (auth.uid() = "userId");

create policy "Enable insert bookmarks for logged-in users" 
    on public.post_bookmarks for insert with check (auth.uid() = "userId");

create policy "Enable insert comments for logged-in users" 
    on public.post_comments for insert with check (auth.uid() = "authorId");

-- Update/delete: Restricted to authors or administrators.
create policy "Enable modify posts for authors or admins"
    on public.social_posts for update
    using (auth.uid() = "authorId" or public.get_my_role() = 'ADMIN')
    with check (auth.uid() = "authorId" or public.get_my_role() = 'ADMIN');

create policy "Enable delete posts for authors or admins"
    on public.social_posts for delete
    using (auth.uid() = "authorId" or public.get_my_role() = 'ADMIN');

create policy "Enable modify reactions for owners"
    on public.post_reactions for update
    using (auth.uid() = "userId")
    with check (auth.uid() = "userId");

create policy "Enable delete reactions for owners"
    on public.post_reactions for delete
    using (auth.uid() = "userId");

create policy "Enable modify bookmarks for owners"
    on public.post_bookmarks for update
    using (auth.uid() = "userId")
    with check (auth.uid() = "userId");

create policy "Enable delete bookmarks for owners"
    on public.post_bookmarks for delete
    using (auth.uid() = "userId");

create policy "Enable modify comments for owners or admins"
    on public.post_comments for update
    using (auth.uid() = "authorId" or public.get_my_role() = 'ADMIN')
    with check (auth.uid() = "authorId" or public.get_my_role() = 'ADMIN');

create policy "Enable delete comments for owners or admins"
    on public.post_comments for delete
    using (auth.uid() = "authorId" or public.get_my_role() = 'ADMIN');


-- --------------------------------------------------------------------
-- REAL-TIME AND SUPABASE PROFILE AUTO-REGISTRATION TRRIGGER
-- --------------------------------------------------------------------
-- Optional but highly recommended: Automatically initializes profile metadata
-- on the public.users database when a guest completes OAuth/Google sign-up.
-- --------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
    insert into public.users (id, name, email, role, "avatarUrl")
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', new.email),
        new.email,
        'GENERAL_USER',
        coalesce(new.raw_user_meta_data->>'avatar_url', '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

-- Note: Un-comment the trigger once your authentication pipeline is live!
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
