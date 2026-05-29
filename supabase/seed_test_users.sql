-- ====================================================================
-- PITHI - TEST LOGIN CREDENTIALS DATABASE SEED SCRIPT
-- ====================================================================
-- This script creates standard test accounts for ALL roles in Pithi.
-- Best executed directly in the Supabase SQL Editor.
--
-- Supported Roles to seed:
--   1. ADMIN         - Admin account (pithi.deva@gmail.com / admin@pithi.com)
--   2. ORGANIZER     - Wedding/event organizer (organizer@pithi.com)
--   3. GENERAL_USER  - Standard customer/owner (client@pithi.com)
--   4. CHEF         - Catering service provider (chef@pithi.com)
--   5. HALL          - Reception venue host (hall@pithi.com)
--   6. MUSIC_BAND    - Music & entertainment band (music@pithi.com)
--   7. BEAUTY_SALON  - Salon & styling vendor (beauty@pithi.com)
--
-- Password for all test users: password123
-- ====================================================================

-- Enable the pgcrypto extension to support password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. CLEANUP PREVIOUS TEST USER RECORDS (Optional - run if you want a clean state)
-- delete from public.users where email in (
--   'pithi.deva@gmail.com', 'admin@pithi.com', 'organizer@pithi.com', 
--   'client@pithi.com', 'chef@pithi.com', 'hall@pithi.com', 
--   'music@pithi.com', 'beauty@pithi.com'
-- );

-- 2. SEED AUTHENTICATION CREDENTIALS & METADATA INTO auth.users AND public.users

-- --------------------------------------------------------------------
-- A. SUPER ADMIN / OWNER (pithi.deva@gmail.com)
-- --------------------------------------------------------------------
DO $$
DECLARE
    new_user_id uuid := 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e501'; -- Hardcoded unique UUID for easy reference
BEGIN
    -- Only insert into auth.users if they don't already exist
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'pithi.deva@gmail.com') THEN
        INSERT INTO auth.users (
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            new_user_id,
            'authenticated',
            'authenticated',
            'pithi.deva@gmail.com',
            crypt('password123', gen_salt('bf')),
            now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"full_name": "Pithi Deva", "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=Admin"}'::jsonb,
            now(),
            now()
        );
    ELSE
        SELECT id INTO new_user_id FROM auth.users WHERE email = 'pithi.deva@gmail.com';
    END IF;

    -- Ensure public profile matches with proper ADMIN role
    INSERT INTO public.users (id, name, email, role, "avatarUrl")
    VALUES (
        new_user_id,
        'Pithi Deva (Admin)',
        'pithi.deva@gmail.com',
        'ADMIN',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Admin'
    )
    ON CONFLICT (id) DO UPDATE 
    SET role = 'ADMIN', name = 'Pithi Deva (Admin)';
END $$;


-- --------------------------------------------------------------------
-- B. ORGANIZER (organizer@pithi.com)
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
            crypt('password123', gen_salt('bf')), now(),
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
-- C. GENERAL_USER / CLIENT / CEREMONY OWNER (client@pithi.com)
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
            crypt('password123', gen_salt('bf')), now(),
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
-- D. CHEF / CATERER (chef@pithi.com)
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
            crypt('password123', gen_salt('bf')), now(),
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
-- E. HALL / VENUE PROVIDER (hall@pithi.com)
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
            crypt('password123', gen_salt('bf')), now(),
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
-- F. MUSIC_BAND / LIVE MUSIC (music@pithi.com)
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
            crypt('password123', gen_salt('bf')), now(),
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
-- G. BEAUTY_SALON / MAKEUP & COSTUME (beauty@pithi.com)
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
            crypt('password123', gen_salt('bf')), now(),
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
