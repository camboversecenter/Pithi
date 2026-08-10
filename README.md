<div align="center">
<img width="960" alt="PITHI - features and how they connect" src="docs/assets/pithi-overview.svg" />
</div>

# ពិធី · PITHI - Cambodian Ceremony Management Platform

PITHI ("ceremony" in Khmer) is a Progressive  planning and managing
traditional Cambodian ceremonies - weddings, birthdays, housewarmings, funerals,
and memorial rites. It connects the people who host and organize events with the
vendors who service them, in a single Khmer-language marketplace. It runs
against Supabase — Postgres, Auth, Storage and Edge Functions — with no custom
application server of its own.

## About the project

PITHI is a **community project**. It is **free for everyone to use - we never
charge users**. Instead, the project sustains itself through voluntary
**support, donations, and training**, never through user fees. PITHI is planned
for release as **open source** (see [License](#license)).

PITHI is **incubated by CamboVerse, at the National University of Management
(NUM)**, Cambodia.

👉 Meet the team, our partners, and our incubator on the
**[About page](ABOUT.md)**.

## Features

- **Role-based portals** - seven roles each get a tailored experience:
  `GENERAL_USER` (event owner), `ORGANIZER` (planner), the vendor roles `CHEF`,
  `HALL`, `MUSIC_BAND`, `BEAUTY_SALON`, and `ADMIN`.
- **Ceremony management** - create and manage events, budgets, guest lists, and
  step-by-step plans from the Organizer and Owner portals.
- **Marketplace & bookings** - vendors publish services; clients search,
  filter (price, location type), and book them, with a booking detail view
  backed by a comment thread and an activity/audit log. Completed bookings
  prompt the client for a star rating + review, and vendors see their ratings.
- **Availability & double-booking protection** - a calendar view of each
  vendor's schedule, busy-time warnings while booking, and a database trigger
  that rejects confirming two overlapping bookings of the same service.
- **Digital invitations & RSVP** - shareable invitation cards and guest RSVP
  tracking, plus QR guest check-in: every accepted guest gets an entry-pass QR
  on their invitation, and hosts scan it at the door (camera scanner with a
  manual fallback) with a live checked-in count.
- **In-app notifications** - a per-user notification inbox (bell + unread
  badge) fed by database triggers and delivered live over Supabase Realtime:
  new bookings, booking status changes, booking comments, guest RSVPs, service
  reviews, and guest-reported gift transfers all notify the affected users.
- **Finance tracking** - record income, expenses, and gifts, plus guest-reported
  bank transfers with AI receipt scanning and KHQR payment support. Includes
  budget-vs-actual tracking with over-budget warnings, CSV export, and a
  print-ready traditional gift ledger (កំណត់ចំណងដៃ).
- **AI assistant (Google Gemini)** - a Khmer chatbot with function-calling tools
  to create ceremonies and book services conversationally; generation of ceremony
  plans, invitation messages, and marketing copy (tone-aware: celebratory for
  weddings, solemn for funerals); banner/service image generation; OCR for bank
  receipts and business cards; and social-post content moderation.
- **Community feed** - knowledge-sharing posts with reactions (like / useful /
  fake), bookmarks, and comments.
- **Admin dashboard** - system-wide management.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, React Router (HashRouter),
  Tailwind CSS, `lucide-react`.
- **Backend:** Supabase - Postgres, Auth, Storage, and Edge Functions. There is
  no custom application server. Access is governed by detailed Postgres
  Row-Level-Security policies (see `supabase/schema.sql`).
- **AI:** Google Gemini, called through the `gemini-proxy` Supabase Edge Function
  so the API key never reaches the client.
- **PWA & deploy:** installable via `vite-plugin-pwa`; deployed to Cloudflare
  Pages with `wrangler`.

## Project Structure

```
App.tsx                 Routing, layout, role-based navigation
pages/                  Route-level screens (portals, marketplace, admin, feed…)
components/             Shared UI plus Organizer/ and Owner/ feature components
contexts/              Global dialog provider
services/              authService, dataService, geminiService, supabaseConfig
supabase/              schema.sql (tables + RLS) and the gemini-proxy Edge Function
```

## Run Locally

**Prerequisites:** Node.js 18+ and a Supabase project (the free tier is enough).

1. Install dependencies:
   ```bash
   npm install
   ```
2. **Create the database.** In the Supabase SQL Editor, run
   `supabase/schema.sql` on a new project, then
   `supabase/migrations/RUN_ALL.sql`. Both are idempotent and non-destructive.
3. **Claim the super administrator** (optional but recommended) so your account
   is promoted to `ADMIN` on first sign-in:
   ```sql
   select public.set_super_admin_email('you@example.com');
   ```
4. **Configure the app.** Copy `.env.example` to `.env.local` and fill in
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and — matching step 3 —
   `VITE_SUPER_ADMIN_EMAIL`. `.env.local` is git-ignored; never commit real
   values.
5. **Enable Google sign-in**, the only supported login method — see
   [`docs/google-signin-setup.md`](docs/google-signin-setup.md).
6. Run the app:
   ```bash
   npm run dev
   ```

### Optional: AI features

The Gemini-backed features go through the `gemini-proxy` Supabase Edge Function
so the API key never reaches the browser. Deploy it and set the secret:

```bash
supabase functions deploy gemini-proxy
supabase secrets set GEMINI_API_KEY=your-key
```

Without it the AI panels stay available but return canned local responses.

### Optional: development test accounts

`supabase/seed_test_users.sql` seeds one password account per non-admin role for
local development. Read the header first — it is for **dev/staging databases
only** and refuses to run until you replace its placeholder password.

## Scripts

- `npm run dev` - start the Vite dev server
- `npm run build` - type-check and build for production
- `npm run lint` - type-check only (`tsc --noEmit`)
- `npm run preview` - preview the production build
- `npm run deploy` - build and deploy to Cloudflare Pages

## License

PITHI is **open source** under the **Apache License 2.0** - see
[`LICENSE`](LICENSE) and [`NOTICE`](NOTICE). Copyright 2026 DEVA.

Apache-2.0 fits a free community project that earns from services (support,
donations, training) rather than license fees: anyone may freely use, modify, and
redistribute the code - maximizing adoption and contributions - while contributors
provide an explicit **patent grant**, and the **PITHI** and **CamboVerse** names
stay protected as trademarks (the license grants no trademark rights).

> Please ensure this aligns with any CamboVerse/NUM incubation IP terms.
> Documentation and other non-code content may additionally be offered under
> **CC BY 4.0**.

## Incubation & acknowledgements

PITHI is incubated by **CamboVerse**, the innovation/startup community at the
**National University of Management (NUM)**, Cambodia. We thank CamboVerse, NUM,
and every contributor, supporter, and donor who helps keep PITHI free for the
community.

See **[ABOUT.md](ABOUT.md)** for the full team, partners, and incubator page.

