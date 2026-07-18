# PWA, Offline & Deployment

Files: `vite.config.ts`, `components/PWAInstallPrompt.tsx`,
`components/PWAUpdateNotification.tsx`, `public/manifest.json`, `wrangler.toml`.

## Progressive Web App

PITHI is installable and offline-capable via `vite-plugin-pwa` (Workbox).

- **Manifest** — name `ពិធី - PITHI Ceremony Planner`, short name `PITHI`, rose
  theme (`#be123c`), standalone portrait display, and 192/512 icons (incl. a
  maskable variant).
- **Service worker** — `registerType: 'autoUpdate'`, precaches the app shell
  (`**/*.{js,css,html,ico,png,svg,woff2,jpg,jpeg}`) with an SPA
  `navigateFallback` to `index.html` (excluding `/api` and Supabase paths).
- **Runtime caching:**
  - Google Fonts → `CacheFirst`, 1 year
  - Images (`png/jpg/jpeg/svg/gif/webp`) → `CacheFirst`, 30 days
  - Supabase (`*.supabase.co`) → `NetworkFirst`, 5s timeout, 1 day

## Install prompt (`PWAInstallPrompt.tsx`)

A custom bottom-sheet prompt that:
- detects standalone mode and hides itself if already installed,
- captures Chromium's `beforeinstallprompt` and shows an **Install** button after
  a short delay,
- shows **iOS Safari** users the manual "Share → Add to Home Screen" instructions
  (dismissal remembered in `localStorage` as `pwa-ios-prompt-dismissed`).

Copy is bilingual (e.g. `ដំឡើងឥឡូវនេះ / Install`, `ពេលក្រោយ / Later`).

## Update notification (`PWAUpdateNotification.tsx`)

Surfaces a prompt when a new service-worker version is available so users can
reload into the latest build (paired with `registerType: 'autoUpdate'`).

## Offline behavior

Offline resilience comes from two layers working together:
1. **The service worker** caches the app shell and assets, so the app loads
   without a network.
2. **The service layer** (`dataService`, `authService`, `geminiService`,
   `storageService`) falls back to localStorage / base64 / canned AI when Supabase
   or Gemini is unreachable — see [data-and-storage.md](data-and-storage.md) and
   [ai-assistant.md](ai-assistant.md).

Together these let the whole app — including sign-in via test accounts, browsing,
and AI content — run with no backend at all.

## Deployment

- **Target:** Cloudflare Pages. `npm run deploy` runs `npm run build` then
  `wrangler pages deploy dist`. `wrangler.toml` holds the Pages project config.
- **Routing:** the app uses `HashRouter`, so it needs no server-side rewrite rules
  to work as static hosting.
- **Build:** `npm run build` = `tsc -b && vite build`; `npm run lint` is
  `tsc --noEmit`.
- **Backend pieces to configure separately:** the Supabase project (schema + RLS
  from `supabase/schema.sql`, the public `PITHI` storage bucket) and the
  `gemini-proxy` Edge Function with its `GEMINI_API_KEY` secret.
</content>
