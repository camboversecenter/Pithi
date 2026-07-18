# Database & Security

File: `supabase/schema.sql` (plus `supabase/add_timestamps.sql`,
`supabase/seed_test_users.sql`)

PITHI's backend is Postgres on Supabase. `schema.sql` defines the tables, atomic
helper functions, Row-Level-Security (RLS) policies, and an auth trigger.

## Tables (15)

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

## Row-Level Security

RLS is enabled on all 15 tables, with per-operation policies. The general model:

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
- **Social writes** (posts, reactions, bookmarks, comments) require the row's
  `authorId`/`userId` to equal `auth.uid()`; edits/deletes are limited to the
  author or an admin.
- **Admin override:** `get_my_role() = 'ADMIN'` grants access across policies.

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
</content>
