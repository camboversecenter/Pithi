-- ====================================================================
-- PITHI · RESET DATA (production preparation)
-- ====================================================================
-- Deletes all *content* - users, ceremonies, bookings, guests, money,
-- messages, notifications, community posts - while keeping everything the
-- system needs to run: tables, columns, functions, triggers, Row-Level
-- Security policies, and your configured settings.
--
--   ####################################################################
--   #  THIS PERMANENTLY DELETES DATA AND CANNOT BE UNDONE.             #
--   #  Take a backup first (Supabase → Database → Backups), and make   #
--   #  sure you are on the intended project.                           #
--   ####################################################################
--
-- HOW TO RUN
--   1. Supabase dashboard → SQL Editor → New query.
--   2. Paste this whole file.
--   3. Change `v_confirm` to true on the line marked below.
--   4. Run. The notices at the end report what was removed.
--
-- WHAT IS KEPT
--   * The schema itself: every table, function, trigger and RLS policy.
--   * public.app_settings - including the super-administrator address, so
--     you do not have to set it again.
--
-- AFTER RUNNING
--   * Everyone must sign in again; each person picks their role afresh.
--   * The super administrator is re-created automatically on their next
--     Google sign-in (handle_new_user reads app_settings).
--   * Storage files are NOT removed by SQL - see the note at the end.
-- ====================================================================

do $$
declare
    -- ⬇⬇⬇  CHANGE THIS TO true TO ACTUALLY DELETE  ⬇⬇⬇
    v_confirm        boolean := false;

    -- Keep existing sign-ins (auth.users) and only wipe app content?
    -- false = full reset, everyone signs up again (recommended for launch).
    -- true  = accounts stay, but all their ceremonies/bookings/etc. are gone.
    v_keep_accounts  boolean := false;

    -- Tables that must survive the reset.
    v_preserve       text[] := array['app_settings'];

    v_table          text;
    v_list           text;
    v_auth_before    bigint;
begin
    if not v_confirm then
        raise exception
            'Safety guard: nothing was deleted. Set v_confirm := true to run this reset.';
    end if;

    select count(*) into v_auth_before from auth.users;

    -- Build the list of public tables to empty, skipping preserved ones.
    -- Done dynamically so tables added by future migrations are covered too.
    select string_agg(format('public.%I', tablename), ', ')
      into v_list
      from pg_tables
     where schemaname = 'public'
       and tablename <> all (v_preserve);

    if v_list is null then
        raise notice 'No tables found to reset.';
    else
        -- One statement: CASCADE satisfies the foreign keys between them and
        -- RESTART IDENTITY sets the bigint id sequences back to 1.
        execute format('truncate table %s restart identity cascade', v_list);
        raise notice 'Emptied tables: %', v_list;
    end if;

    if v_keep_accounts then
        raise notice 'Kept % auth account(s). They will be asked to choose a role again.', v_auth_before;
    else
        -- public.users has "references auth.users on delete cascade", so this
        -- also clears any profile row recreated by a trigger in between.
        delete from auth.users;
        raise notice 'Deleted % auth account(s).', v_auth_before;
    end if;

    raise notice 'Preserved: %', array_to_string(v_preserve, ', ');
    raise notice 'Super administrator still configured as: %',
        coalesce(public.super_admin_email(), '(not set)');
    raise notice 'RESET COMPLETE.';
end $$;


-- --------------------------------------------------------------------
-- VERIFY (safe to run on its own)
-- --------------------------------------------------------------------
select 'auth.users'  as table_name, count(*) as rows from auth.users
union all select 'users',          count(*) from public.users
union all select 'ceremonies',     count(*) from public.ceremonies
union all select 'services',       count(*) from public.services
union all select 'bookings',       count(*) from public.bookings
union all select 'guests',         count(*) from public.guests
union all select 'transactions',   count(*) from public.transactions
union all select 'social_posts',   count(*) from public.social_posts
union all select 'app_settings (kept)', count(*) from public.app_settings
order by table_name;


-- --------------------------------------------------------------------
-- STORAGE IS NOT COVERED BY THIS SCRIPT
-- --------------------------------------------------------------------
-- Uploaded files (receipt images, ceremony banners, service photos) live in
-- Supabase Storage, not in these tables. Deleting rows from storage.objects
-- does NOT delete the underlying files, so empty the bucket from the
-- dashboard instead:
--
--     Supabase → Storage → PITHI → select all → Delete
--
-- To see what is there first:
--     select name, created_at from storage.objects
--      where bucket_id = 'PITHI' order by created_at desc;
