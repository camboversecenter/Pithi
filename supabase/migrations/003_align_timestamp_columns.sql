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
