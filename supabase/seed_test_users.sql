-- ====================================================================
-- PITHI - DEVELOPMENT TEST ACCOUNTS SEED SCRIPT
-- ====================================================================
--
--   ####################################################################
--   #  DEVELOPMENT AND STAGING ONLY. NEVER RUN THIS ON PRODUCTION.     #
--   #                                                                  #
--   #  It creates password-login accounts with a single shared         #
--   #  password. Anyone who knows an address below can sign in as      #
--   #  that role. Production uses Google OAuth only.                   #
--   ####################################################################
--
-- Creates one test account per non-admin role:
--   ORGANIZER     - Wedding/event organizer (organizer@pithi.com)
--   GENERAL_USER  - Standard customer/owner (client@pithi.com)
--   CHEF          - Catering service provider (chef@pithi.com)
--   HALL          - Reception venue host (hall@pithi.com)
--   MUSIC_BAND    - Music & entertainment band (music@pithi.com)
--   BEAUTY_SALON  - Salon & styling vendor (beauty@pithi.com)
--
-- No ADMIN account is seeded on purpose — a preset administrator with a
-- shared password is a backdoor. To get an admin on a dev database, sign in
-- normally and then promote yourself from the SQL editor:
--
--   update public.users set role = 'ADMIN' where email = 'you@example.com';
--
-- HOW TO RUN
--   1. Replace CHANGE_ME below with a throwaway password (12+ characters).
--   2. Run the whole file in the Supabase SQL Editor of a DEV project.
-- The script refuses to run while the placeholder is still in place.
-- ====================================================================

-- Enable the pgcrypto extension to support password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------------------------------------------------------------------
-- 0. SEED PASSWORD — replace CHANGE_ME, then run.
-- --------------------------------------------------------------------
select set_config('pithi.seed_password', 'CHANGE_ME', false);

DO $$
DECLARE
    v_password text := current_setting('pithi.seed_password', true);
BEGIN
    IF v_password IS NULL OR v_password = 'CHANGE_ME' THEN
        RAISE EXCEPTION
            'Refusing to seed: replace CHANGE_ME at the top of this file with a throwaway password first.';
    END IF;

    IF length(v_password) < 12 THEN
        RAISE EXCEPTION
            'Refusing to seed: the seed password must be at least 12 characters (got %).', length(v_password);
    END IF;
END $$;

-- 1. CLEANUP PREVIOUS TEST USER RECORDS (Optional - run if you want a clean state)
-- delete from public.users where email in (
--   'organizer@pithi.com', 'client@pithi.com', 'chef@pithi.com',
--   'hall@pithi.com', 'music@pithi.com', 'beauty@pithi.com'
-- );

-- 2. SEED AUTHENTICATION CREDENTIALS & METADATA INTO auth.users AND public.users


-- --------------------------------------------------------------------
-- A. ORGANIZER (organizer@pithi.com)
-- --------------------------------------------------------------------
DO $$
DECLARE
    new_user_id uuid := 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e502';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'organizer@pithi.com') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            new_user_id, 'authenticated', 'authenticated', 'organizer@pithi.com',
            crypt(current_setting('pithi.seed_password'), gen_salt('bf')), now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"full_name": "Dararoth Wedding Planner"}'::jsonb,
            now(), now()
        );
    ELSE
        SELECT id INTO new_user_id FROM auth.users WHERE email = 'organizer@pithi.com';
    END IF;

    INSERT INTO public.users (id, name, email, role, "avatarUrl")
    VALUES (
        new_user_id,
        'Dararoth Wedding Planner',
        'organizer@pithi.com',
        'ORGANIZER',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Organizer'
    )
    ON CONFLICT (id) DO UPDATE SET role = 'ORGANIZER';
END $$;


-- --------------------------------------------------------------------
-- B. GENERAL_USER / CLIENT / CEREMONY OWNER (client@pithi.com)
-- --------------------------------------------------------------------
DO $$
DECLARE
    new_user_id uuid := 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e503';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'client@pithi.com') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            new_user_id, 'authenticated', 'authenticated', 'client@pithi.com',
            crypt(current_setting('pithi.seed_password'), gen_salt('bf')), now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"full_name": "Sophea & Chantrea"}'::jsonb,
            now(), now()
        );
    ELSE
        SELECT id INTO new_user_id FROM auth.users WHERE email = 'client@pithi.com';
    END IF;

    INSERT INTO public.users (id, name, email, role, "avatarUrl")
    VALUES (
        new_user_id,
        'Sophea & Chantrea',
        'client@pithi.com',
        'GENERAL_USER',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Client'
    )
    ON CONFLICT (id) DO UPDATE SET role = 'GENERAL_USER';
END $$;


-- --------------------------------------------------------------------
-- C. CHEF / CATERER (chef@pithi.com)
-- --------------------------------------------------------------------
DO $$
DECLARE
    new_user_id uuid := 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e504';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'chef@pithi.com') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            new_user_id, 'authenticated', 'authenticated', 'chef@pithi.com',
            crypt(current_setting('pithi.seed_password'), gen_salt('bf')), now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"full_name": "Meng Catering Chef"}'::jsonb,
            now(), now()
        );
    ELSE
        SELECT id INTO new_user_id FROM auth.users WHERE email = 'chef@pithi.com';
    END IF;

    INSERT INTO public.users (id, name, email, role, "avatarUrl")
    VALUES (
        new_user_id,
        'Meng Catering Chef',
        'chef@pithi.com',
        'CHEF',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Chef'
    )
    ON CONFLICT (id) DO UPDATE SET role = 'CHEF';
END $$;


-- --------------------------------------------------------------------
-- D. HALL / VENUE PROVIDER (hall@pithi.com)
-- --------------------------------------------------------------------
DO $$
DECLARE
    new_user_id uuid := 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e505';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'hall@pithi.com') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            new_user_id, 'authenticated', 'authenticated', 'hall@pithi.com',
            crypt(current_setting('pithi.seed_password'), gen_salt('bf')), now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"full_name": "Phnom Penh Palace Hall"}'::jsonb,
            now(), now()
        );
    ELSE
        SELECT id INTO new_user_id FROM auth.users WHERE email = 'hall@pithi.com';
    END IF;

    INSERT INTO public.users (id, name, email, role, "avatarUrl")
    VALUES (
        new_user_id,
        'Phnom Penh Palace Hall',
        'hall@pithi.com',
        'HALL',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Hall'
    )
    ON CONFLICT (id) DO UPDATE SET role = 'HALL';
END $$;


-- --------------------------------------------------------------------
-- E. MUSIC_BAND / LIVE MUSIC (music@pithi.com)
-- --------------------------------------------------------------------
DO $$
DECLARE
    new_user_id uuid := 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e506';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'music@pithi.com') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            new_user_id, 'authenticated', 'authenticated', 'music@pithi.com',
            crypt(current_setting('pithi.seed_password'), gen_salt('bf')), now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"full_name": "Pleng Khmer Traditional Band"}'::jsonb,
            now(), now()
        );
    ELSE
        SELECT id INTO new_user_id FROM auth.users WHERE email = 'music@pithi.com';
    END IF;

    INSERT INTO public.users (id, name, email, role, "avatarUrl")
    VALUES (
        new_user_id,
        'Pleng Khmer Traditional Band',
        'music@pithi.com',
        'MUSIC_BAND',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Music'
    )
    ON CONFLICT (id) DO UPDATE SET role = 'MUSIC_BAND';
END $$;


-- --------------------------------------------------------------------
-- F. BEAUTY_SALON / MAKEUP & COSTUME (beauty@pithi.com)
-- --------------------------------------------------------------------
DO $$
DECLARE
    new_user_id uuid := 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e507';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'beauty@pithi.com') THEN
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            new_user_id, 'authenticated', 'authenticated', 'beauty@pithi.com',
            crypt(current_setting('pithi.seed_password'), gen_salt('bf')), now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"full_name": "Sovannaphumi Beauty Salon"}'::jsonb,
            now(), now()
        );
    ELSE
        SELECT id INTO new_user_id FROM auth.users WHERE email = 'beauty@pithi.com';
    END IF;

    INSERT INTO public.users (id, name, email, role, "avatarUrl")
    VALUES (
        new_user_id,
        'Sovannaphumi Beauty Salon',
        'beauty@pithi.com',
        'BEAUTY_SALON',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Beauty'
    )
    ON CONFLICT (id) DO UPDATE SET role = 'BEAUTY_SALON';
END $$;

-- ====================================================================
-- SEED SCRIPT END
-- ====================================================================
