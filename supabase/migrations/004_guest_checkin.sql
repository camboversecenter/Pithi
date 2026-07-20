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
