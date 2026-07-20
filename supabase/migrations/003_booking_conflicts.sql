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
