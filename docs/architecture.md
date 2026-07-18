# Architecture Overview

PITHI is a single-page React application backed entirely by Supabase, with an
unusual design goal: **every feature must keep working even when there is no
backend, no network, or no AI key configured.** Understanding that goal explains
most of the code you will read.

## High-level shape

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (PWA)                          │
│                                                               │
│  React 18 + React Router (HashRouter)                         │
│  Tailwind CSS · lucide-react icons                            │
│                                                               │
│  pages/*          route-level screens                         │
│  components/*     shared + Organizer/ + Owner/ UI             │
│  contexts/*       GlobalDialogContext (confirm/alert dialogs) │
│                                                               │
│  services/                                                    │
│   ├─ authService     session, roles, test/mock users          │
│   ├─ dataService     all CRUD (Supabase ⇄ localStorage)       │
│   ├─ geminiService   AI calls (proxy ⇄ local simulation)      │
│   ├─ storageService  image upload (bucket ⇄ base64)           │
│   └─ supabaseConfig  Supabase client                          │
└───────────────┬───────────────────────────────┬──────────────┘
                │ supabase-js                    │ functions.invoke
                ▼                                 ▼
   ┌────────────────────────┐        ┌───────────────────────────┐
   │  Supabase              │        │  Edge Function            │
   │  Postgres (+ RLS)      │        │  gemini-proxy (Deno)      │
   │  Auth (Google OAuth)   │        │  → Google Gemini API      │
   │  Storage (PITHI bucket)│        │  (GEMINI_API_KEY secret)  │
   └────────────────────────┘        └───────────────────────────┘
```

## Layers

### 1. Routing & layout (`App.tsx`)
- Uses `HashRouter` (URLs look like `/#/marketplace`) so the app can be hosted
  as static files on Cloudflare Pages with no server-side routing.
- `Layout` wraps every route. It subscribes to auth changes, shows a loading
  spinner until auth initializes, and enforces access:
  - Public paths: `/welcome`, `/login`, `/guide`, and any `/invitation/:id`.
  - A pending registration (chose to sign up but hasn't picked a role) is forced
    to `/select-role`.
  - Logged-in users hitting `/login` or `/select-role` are redirected to `/`.
- `PrivateRoute` guards authenticated screens.
- Navigation is **role-aware** — `DesktopSidebar` and `MobileBottomNav` render
  different items per role (see `docs/authentication-and-roles.md`).

### 2. Service layer (`services/`)
This is where the offline-first design lives. Each data function follows the
same pattern:

```
if (isLocalMode())   → read/write localStorage (demo data)
else try Supabase    → on ANY error, console.warn and fall back to localStorage
```

`isLocalMode()` is simply "is there a `pithi_mock_user` in localStorage?" This
means a demo/mock session never touches the network, and a real session that
hits an RLS error, a missing table, or a network failure degrades to local data
instead of crashing. The same philosophy applies to images (`storageService`
falls back to base64 data URLs) and AI (`geminiService` falls back to canned
responses and canvas-drawn images).

### 3. Backend (Supabase)
- **Postgres** with 15 tables and detailed Row-Level-Security policies — see
  `docs/database-and-security.md`.
- **Auth** via Google OAuth; a DB trigger auto-creates a `public.users` profile
  on first sign-in.
- **Storage** in a public bucket named `PITHI`, organized into
  `services/`, `ceremonies/`, `receipts/`, `templates/` folders.
- **Edge Function** `gemini-proxy` keeps the Gemini API key server-side.

## Key conventions

- **Language:** the UI is written in Khmer; many demo records include a bilingual
  Khmer + English label. Ceremony/plan/invitation content is tone-aware
  (celebratory for weddings/birthdays, solemn for funerals/memorials).
- **Money:** amounts are stored as numbers; `KHR` reported gifts are converted to
  USD at a fixed `÷ 4000` rate when confirmed into the budget.
- **Soft-delete columns:** every table carries `createdAt` / `updatedAt` /
  `deletedAt`, though most delete paths currently hard-delete.
- **IDs:** users and ceremonies use UUIDs; services, bookings, guests, posts, and
  most child tables use `bigint identity` keys.

## Where to read next

| Topic | Doc |
|-------|-----|
| Sign-in, roles, navigation, demo mode | `authentication-and-roles.md` |
| Organizer workflows | `organizer-portal.md` |
| Owner (event host) workflows & budget | `owner-portal.md` |
| Vendor services & the marketplace | `marketplace-and-services.md` |
| Booking lifecycle | `bookings.md` |
| Invitations & guest RSVP | `invitations-and-rsvp.md` |
| Community knowledge feed | `community-feed.md` |
| Admin tools | `admin-dashboard.md` |
| Home dashboard | `dashboard.md` |
| AI features | `ai-assistant.md` |
| Data functions & offline fallback | `data-and-storage.md` |
| Schema & RLS policies | `database-and-security.md` |
| PWA / installability / offline | `pwa-and-offline.md` |
</content>
