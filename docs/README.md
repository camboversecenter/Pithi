# PITHI Documentation

Detailed, feature-by-feature documentation for **PITHI (ពិធី)** — a
Khmer-language Progressive Web App for planning and managing traditional
Cambodian ceremonies (weddings, birthdays, housewarmings, funerals, memorials).
It connects event **owners** and **organizers** with service **vendors** in a
single marketplace, and is designed to keep working even with no backend, no
network, or no AI key.

For a quick project overview and setup instructions, see the
[root README](../README.md).

## Start here

- **[architecture.md](architecture.md)** — the big picture: layers, the
  offline-first design, and how everything fits together. Read this first.

## Features

| Doc | What it covers |
|-----|----------------|
| [authentication-and-roles.md](authentication-and-roles.md) | Sign-in options, the seven roles, role selection, session handling, route guards, navigation, the public landing page, and demo mode |
| [google-signin-setup.md](google-signin-setup.md) | Supabase + Google Cloud configuration required for real Google OAuth |
| [dashboard.md](dashboard.md) | The role-adaptive home screen and the AI chat assistant |
| [organizer-portal.md](organizer-portal.md) | Planner workflows: ceremonies, guests, invitations, plans, owner assignment |
| [owner-portal.md](owner-portal.md) | Host workflows and the budget/finance tab |
| [marketplace-and-services.md](marketplace-and-services.md) | Vendor service listings and client discovery/booking |
| [bookings.md](bookings.md) | The booking lifecycle, statuses, comments, and audit log |
| [invitations-and-rsvp.md](invitations-and-rsvp.md) | Digital invitations, RSVP, and guest gift/transfer reporting |
| [community-feed.md](community-feed.md) | The community knowledge feed: posts, reactions, bookmarks, comments |
| [admin-dashboard.md](admin-dashboard.md) | System stats, user/admin management, and data cleanup |

## Cross-cutting systems

| Doc | What it covers |
|-----|----------------|
| [ai-assistant.md](ai-assistant.md) | Every Gemini-powered feature and its graceful fallbacks |
| [data-and-storage.md](data-and-storage.md) | The data function catalogue, the Supabase ⇄ localStorage pattern, and image storage |
| [database-and-security.md](database-and-security.md) | Postgres schema, helper functions, and Row-Level-Security policies |
| [pwa-and-offline.md](pwa-and-offline.md) | Installability, offline caching, and Cloudflare Pages deployment |

## Related / exploratory

| Doc | What it covers |
|-----|----------------|
| [ksl-roadmap.md](ksl-roadmap.md) | Khmer Sign Language recognition/translation roadmap — an exploratory accessibility initiative (not part of the shipped app) |

## Roles at a glance

| Role | Primary surface |
|------|-----------------|
| `GENERAL_USER` (event owner) | [Owner Portal](owner-portal.md), [Marketplace](marketplace-and-services.md) |
| `ORGANIZER` | [Organizer Portal](organizer-portal.md), [Marketplace](marketplace-and-services.md) |
| `CHEF` / `HALL` / `MUSIC_BAND` / `BEAUTY_SALON` | [Vendor services](marketplace-and-services.md), [Bookings](bookings.md) |
| `ADMIN` | [Admin Dashboard](admin-dashboard.md) |

## A note on accuracy

These docs describe the code as it currently stands, including a few things worth
knowing: route guards enforce "logged in" but not role (data is protected by RLS,
not routing); the community comment gate is `useful > 100` in code though the UI
says "100"; the Supabase URL/anon key are hardcoded rather than read from env
vars; and KHR gifts are converted to USD at a fixed 1:4000 rate. Each is called
out in the relevant document.
</content>
