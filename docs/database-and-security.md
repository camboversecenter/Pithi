# Database & Security

File: `supabase/schema.sql` (plus `supabase/add_timestamps.sql`,
`supabase/seed_test_users.sql`)

PITHI's backend is Postgres on Supabase. `schema.sql` defines the tables, atomic
helper functions, Row-Level-Security (RLS) policies, and an auth trigger.

## Tables (18)

| Table | Purpose | Key type |
|-------|---------|----------|
| `users` | Public profiles, synced to `auth.users` | uuid |
| `ceremonies` | Events (wedding, funeral, …) | uuid |
| `services` | Marketplace listings | bigint |
| `bookings` | Service reservations | bigint |
| `booking_comments` | Client↔provider chat | bigint |
| `booking_logs` | Booking audit trail | bigint |
| `guests` | RSVP list per ceremony | bigint |
| `invitation_templates` | Per-tier invitation layouts | bigint |
| `transactions` | Budget income/expense/gift | bigint |
| `reported_transactions` | Guest-reported bank transfers | bigint |
| `reviews` | Service ratings (1–5) | bigint |
| `social_posts` | Community feed posts | bigint |
| `post_reactions` | LIKE / USEFUL / FAKE (unique per user+post) | bigint |
| `post_bookmarks` | Saved posts (unique per user+post) | bigint |
| `post_comments` | Feed comments | bigint |
| `notifications` | Per-user inbox, written only by triggers | bigint |
| `direct_messages` | One-to-one chat, optional photo/voice attachment | bigint |
| `announcements` | Broadcast to a ceremony's guests or a vendor's clients | bigint |

Every table carries `createdAt` / `updatedAt` / `deletedAt` columns. Roles are
enforced as `text` check-constraints matching the `UserRole` enum. Column names
are quoted camelCase to match the TypeScript models directly.

## Helper functions

- **`increment_post_stat(post_id, col)` / `decrement_post_stat(post_id, col)`** —
  `security definer` functions that atomically bump `likes` / `useful` / `fakes` /
  `bookmarksCount` on a post (decrement floors at 0). Called via RPC from
  `reactToPost` and `bookmarkPost`.
- **`get_my_role()`** — a `security definer`, `stable` function returning the
  caller's role; used throughout the RLS policies to avoid recursive `users`
  lookups.
- **`push_notification(...)`** — `security definer`, revoked from clients. Every
  notification row is written by a trigger through this function, so a user can
  never forge one for somebody else. It skips notifying the actor themselves.
- **`get_public_invitation(ceremony)`** — returns the handful of columns a shared
  invitation link needs. Granted to `anon`, because RLS otherwise hides
  `ceremonies` from a guest who is not signed in.
- **`rsvp_to_ceremony(ceremony, name, phone, guestType)`** — the write side of the
  same flow: validates the name, refuses past ceremonies, de-duplicates repeat
  submissions, and inserts the guest as `ACCEPTED`. Granted to `anon`.

## Row-Level Security

RLS is enabled on all 18 tables, with per-operation policies. The general model:

- **Public-readable directories:** `users`, `services`, `guests`, `reviews`,
  `invitation_templates`, and all social tables allow `select` to everyone (so the
  marketplace, invitations, and feed work for guests).
- **Ceremonies** are readable by their organizer, their owner, an admin, or any
  registered guest of that ceremony. Insert requires you to be the organizer or
  owner; update/delete restricted to organizer/owner (delete: organizer or admin).
- **Bookings** are visible to the booker, the provider, or an admin; only clients/
  organizers can create them; either party (or admin) can update.
- **Booking comments/logs** require you to be a party to the booking.
- **Transactions & reported transactions** are scoped to the ceremony's
  organizer/owner (plus, for reports, the guest who filed them). Guests can insert
  a report; only planners/admins confirm or delete.
- **Direct messages** are readable only by their sender and recipient; you may
  only insert rows where `senderId = auth.uid()`.
- **Announcements** are readable by the author, the ceremony's planners and
  guests (for `CEREMONY_GUESTS`), or the vendor's clients (for `VENDOR_CLIENTS`).
  Insert requires you to be a planner of the ceremony you are addressing.
- **Notifications** allow select/update/delete of your own rows only — and there
  is deliberately **no insert policy**; the triggers below are the only writers.
- **Social writes** (posts, reactions, bookmarks, comments) require the row's
  `authorId`/`userId` to equal `auth.uid()`; edits/deletes are limited to the
  author or an admin.
- **Admin override:** `get_my_role() = 'ADMIN'` grants access across policies.

## Notification triggers

Rows are fanned out server-side so nothing depends on a client staying open:
`notify_on_booking_created`, `notify_on_booking_status_change`,
`notify_on_booking_comment`, `notify_on_guest_rsvp` (status change),
**`notify_on_guest_added`** (a link RSVP is an INSERT, not an UPDATE — without
this one the owner never hears about guests who signed up through a shared
link), `notify_on_review_created`, `notify_on_gift_reported`,
`notify_on_direct_message`, and `fanout_announcement`.

## Auth trigger

`handle_new_user()` fires `after insert on auth.users` and auto-creates a
`public.users` profile (defaulting to `GENERAL_USER`) from the OAuth metadata, so
a first Google sign-in provisions a profile automatically. The app layer
additionally auto-promotes the fixed admin email to `ADMIN`.

## Relationship to the app's offline mode

RLS is the real data-protection boundary for online sessions. Note that the app's
route guards do **not** enforce role (any logged-in user can hash-navigate to any
page) — it is RLS that actually prevents unauthorized reads/writes. In mock/demo
mode none of this applies, because the app is operating entirely on localStorage
(see [data-and-storage.md](data-and-storage.md)).
