-- Migration script to add standard timestamp tracking fields to all core tables

-- 1. Create trimmer/updater helper function for updatedAt
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Add columns to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_users_updated_at ON public.users;
CREATE TRIGGER tr_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 3. Add columns to public.ceremonies
ALTER TABLE public.ceremonies ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE public.ceremonies ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.ceremonies ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_ceremonies_updated_at ON public.ceremonies;
CREATE TRIGGER tr_ceremonies_updated_at
    BEFORE UPDATE ON public.ceremonies
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 4. Add columns to public.services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_services_updated_at ON public.services;
CREATE TRIGGER tr_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 5. Add columns to public.bookings (already has createdAt)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_bookings_updated_at ON public.bookings;
CREATE TRIGGER tr_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 6. Add columns to public.booking_comments
ALTER TABLE public.booking_comments ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE public.booking_comments ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.booking_comments ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_booking_comments_updated_at ON public.booking_comments;
CREATE TRIGGER tr_booking_comments_updated_at
    BEFORE UPDATE ON public.booking_comments
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 7. Add columns to public.booking_logs
ALTER TABLE public.booking_logs ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE public.booking_logs ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.booking_logs ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_booking_logs_updated_at ON public.booking_logs;
CREATE TRIGGER tr_booking_logs_updated_at
    BEFORE UPDATE ON public.booking_logs
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 8. Add columns to public.guests
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_guests_updated_at ON public.guests;
CREATE TRIGGER tr_guests_updated_at
    BEFORE UPDATE ON public.guests
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 9. Add columns to public.invitation_templates
ALTER TABLE public.invitation_templates ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE public.invitation_templates ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.invitation_templates ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_invitation_templates_updated_at ON public.invitation_templates;
CREATE TRIGGER tr_invitation_templates_updated_at
    BEFORE UPDATE ON public.invitation_templates
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 10. Add columns to public.transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_transactions_updated_at ON public.transactions;
CREATE TRIGGER tr_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 11. Add columns to public.reported_transactions
ALTER TABLE public.reported_transactions ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE public.reported_transactions ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.reported_transactions ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_reported_transactions_updated_at ON public.reported_transactions;
CREATE TRIGGER tr_reported_transactions_updated_at
    BEFORE UPDATE ON public.reported_transactions
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 12. Add columns to public.reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_reviews_updated_at ON public.reviews;
CREATE TRIGGER tr_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 13. Add columns to public.social_posts (already has createdAt)
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_social_posts_updated_at ON public.social_posts;
CREATE TRIGGER tr_social_posts_updated_at
    BEFORE UPDATE ON public.social_posts
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 14. Add columns to public.post_reactions
ALTER TABLE public.post_reactions ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE public.post_reactions ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.post_reactions ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_post_reactions_updated_at ON public.post_reactions;
CREATE TRIGGER tr_post_reactions_updated_at
    BEFORE UPDATE ON public.post_reactions
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 15. Add columns to public.post_bookmarks
ALTER TABLE public.post_bookmarks ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE public.post_bookmarks ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.post_bookmarks ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_post_bookmarks_updated_at ON public.post_bookmarks;
CREATE TRIGGER tr_post_bookmarks_updated_at
    BEFORE UPDATE ON public.post_bookmarks
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 16. Add columns to public.post_comments (already has createdAt)
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

DROP TRIGGER IF EXISTS tr_post_comments_updated_at ON public.post_comments;
CREATE TRIGGER tr_post_comments_updated_at
    BEFORE UPDATE ON public.post_comments
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
