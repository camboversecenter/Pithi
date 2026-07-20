<div align="center">
<img width="960" alt="PITHI — features and how they connect" src="docs/assets/pithi-overview.svg" />
</div>

# ពិធី · PITHI — Cambodian Ceremony Management Platform

PITHI ("ceremony" in Khmer) is a Progressive Web App for planning and managing
traditional Cambodian ceremonies — weddings, birthdays, housewarmings, funerals,
and memorial rites. It connects the people who host and organize events with the
vendors who service them, in a single Khmer-language marketplace. It works fully
online against Supabase, and also runs in a self-contained demo mode with no
backend at all.

## About the project

PITHI is a **community project**. It is **free for everyone to use — we never
charge users**. Instead, the project sustains itself through voluntary
**support, donations, and training**, never through user fees. PITHI is planned
for release as **open source** (see [License](#license)).

PITHI is **incubated by CamboVerse, at the National University of Management
(NUM)**, Cambodia.

## Features

- **Role-based portals** — seven roles each get a tailored experience:
  `GENERAL_USER` (event owner), `ORGANIZER` (planner), the vendor roles `CHEF`,
  `HALL`, `MUSIC_BAND`, `BEAUTY_SALON`, and `ADMIN`.
- **Ceremony management** — create and manage events, budgets, guest lists, and
  step-by-step plans from the Organizer and Owner portals.
- **Marketplace & bookings** — vendors publish services; clients search,
  filter (price, location type), and book them, with a booking detail view
  backed by a comment thread and an activity/audit log. Completed bookings
  prompt the client for a star rating + review, and vendors see their ratings.
- **Availability & double-booking protection** — a calendar view of each
  vendor's schedule, busy-time warnings while booking, and a database trigger
  that rejects confirming two overlapping bookings of the same service.
- **Digital invitations & RSVP** — shareable invitation cards and guest RSVP
  tracking, plus QR guest check-in: every accepted guest gets an entry-pass QR
  on their invitation, and hosts scan it at the door (camera scanner with a
  manual fallback) with a live checked-in count.
- **In-app notifications** — a per-user notification inbox (bell + unread
  badge) fed by database triggers and delivered live over Supabase Realtime:
  new bookings, booking status changes, booking comments, guest RSVPs, service
  reviews, and guest-reported gift transfers all notify the affected users.
- **Finance tracking** — record income, expenses, and gifts, plus guest-reported
  bank transfers with AI receipt scanning and KHQR payment support. Includes
  budget-vs-actual tracking with over-budget warnings, CSV export, and a
  print-ready traditional gift ledger (កំណត់ចំណងដៃ).
- **AI assistant (Google Gemini)** — a Khmer chatbot with function-calling tools
  to create ceremonies and book services conversationally; generation of ceremony
  plans, invitation messages, and marketing copy (tone-aware: celebratory for
  weddings, solemn for funerals); banner/service image generation; OCR for bank
  receipts and business cards; and social-post content moderation.
- **Community feed** — knowledge-sharing posts with reactions (like / useful /
  fake), bookmarks, and comments.
- **Admin dashboard** — system-wide management.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, React Router (HashRouter),
  Tailwind CSS, `lucide-react`.
- **Backend:** Supabase — Postgres, Auth, Storage, and Edge Functions. There is
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

## Local / Demo Mode

The app detects a `pithi_mock_user` in `localStorage` and, when present,
short-circuits `dataService`, `authService`, and `geminiService` to fully
simulated data and canned AI responses. AI image generation degrades gracefully
to procedurally drawn HTML5 Canvas banners in a Khmer decorative style. This
lets the entire app be demoed without any backend configured.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure Supabase — copy `.env.example` to `.env.local` and set your
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. To enable the AI features,
   set the `GEMINI_API_KEY` secret on the `gemini-proxy` Supabase Edge Function.
3. Run the app:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and build for production
- `npm run lint` — type-check only (`tsc --noEmit`)
- `npm run preview` — preview the production build
- `npm run deploy` — build and deploy to Cloudflare Pages

## License

PITHI is **open source** under the **Apache License 2.0** — see
[`LICENSE`](LICENSE) and [`NOTICE`](NOTICE). Copyright 2026 DEVA.

Apache-2.0 fits a free community project that earns from services (support,
donations, training) rather than license fees: anyone may freely use, modify, and
redistribute the code — maximizing adoption and contributions — while contributors
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

