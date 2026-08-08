# Admin Dashboard

Route: `/admin` · Role: `ADMIN` (non-admins see `គ្មានសិទ្ធិ។` — "No permission")
· File: `pages/AdminDashboard.tsx`

The system control panel (`ផ្ទាំងគ្រប់គ្រងប្រព័ន្ធ`). The **super admin** — the
address configured in `VITE_SUPER_ADMIN_EMAIL` — gets extra abilities and cannot
be demoted. With that variable unset there is no super admin, and every admin is
an ordinary `ADMIN` granted from this page.

## System stats

Four cards from `getSystemStats`:
- Total users (`អ្នកប្រើប្រាស់សរុប`)
- Total ceremonies (`កម្មវិធីសរុប`)
- Total bookings (`ការកក់សរុប`)
- Transaction volume (`ទំហំទឹកប្រាក់`, summed transaction amounts)

## User management

- **All Users table** — searchable by name/email, role badge, paginated 10/page.
- **Admin list** — shows every admin; the super admin is tagged `SUPER` and
  cannot be removed. **Add Admin** promotes a user by email
  (`addAdminByEmail`); the trash action demotes an admin back to `GENERAL_USER`
  (`removeAdmin`), with a confirmation modal. You cannot remove yourself or the
  super admin.

## Super-admin perspective switch

Only the super admin sees a row of six role buttons that call `switchMyRole` and
navigate home, letting them experience the app as any role ("Testing Only •
Perspective Mode").

## System maintenance / cleanup

A card shows how much stale data exists (`getCleanupStats`):
- old bank-receipt reports older than 90 days
- cancelled bookings older than 60 days

The **Delete old files** button runs `runCleanup`, which:
- removes receipt images and reported-transaction rows older than **90 days**,
- deletes cancelled bookings older than **60 days**,
- deletes social posts with ≥ 300 `fakes`, and low-engagement posts older than a
  year,

then reports how many rows were removed. The button is disabled when there is
nothing to clean.

## Functions used

Auth: `getUsers`, `getAdmins`, `addAdminByEmail`, `removeAdmin`, `isSuperAdmin`,
`switchMyRole`, `getCurrentUser`. Data: `getSystemStats`, `getCleanupStats`,
`runCleanup`.

> These cleanup and stats functions call Supabase directly (no localStorage
> fallback), so the Admin Dashboard is meaningful only against a real backend.
