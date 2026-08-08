# Authentication, Roles & Navigation

Files: `pages/Login.tsx`, `pages/RoleSelection.tsx`, `services/authService.ts`,
`App.tsx`, `contexts/GlobalDialogContext.tsx`

## Roles

PITHI has seven roles (`types.ts`), and they drive navigation, which portal you
land in, and (server-side) what data you can touch:

| Role | Khmer label | Who it is |
|------|-------------|-----------|
| `GENERAL_USER` | អ្នកប្រើប្រាស់ទូទៅ (ម្ចាស់កម្មវិធី) | Event **owner/host** — creates their own ceremonies, books vendors |
| `ORGANIZER` | អ្នករៀបចំកម្មវិធី | Professional planner/coordinator managing ceremonies for clients |
| `CHEF` | ចុងភៅ / ម្ហូបអាហារ | Catering vendor |
| `HALL` | ទីតាំង / សាល | Venue/hall vendor |
| `MUSIC_BAND` | ក្រុមតន្ត្រី | Music band vendor |
| `BEAUTY_SALON` | សម្អាងការ | Beauty/decoration vendor |
| `ADMIN` | គ្រប់គ្រងប្រព័ន្ធ | Super administrator |

The four vendor roles are handled as a group throughout the code
(`['CHEF','HALL','MUSIC_BAND','BEAUTY_SALON']`).

## Public landing page (`pages/Landing.tsx`)

The first thing a logged-out visitor sees is the public landing page at
`/welcome` — a marketing front page with the PITHI pitch, feature highlights,
the roles it serves, the community/free/open-source note, and calls-to-action
into `/login`. `Layout` redirects any logged-out visit to a non-public route
(including `/`) to `/welcome`; logged-in users hitting `/welcome` are bounced to
the dashboard.

## Sign-in (`pages/Login.tsx`)

**Google OAuth is the only way in.** `supabase.auth.signInWithOAuth` is called
with `redirectTo: window.location.origin`, and the Supabase client uses the
**PKCE flow** so the OAuth result comes back as a `?code=` query param rather
than a `#access_token` hash fragment (which would collide with the hash
router). Making Google sign-in work also requires dashboard configuration —
see [google-signin-setup.md](google-signin-setup.md).

The screen also carries an inline troubleshooting panel for Google's
*Error 403: org_internal*, which shows the callback URL derived from the
configured `VITE_SUPABASE_URL`. When Supabase is not configured at all, the
sign-in button is replaced by setup instructions.

> Earlier versions also offered email/password sign-in, a Google "simulator",
> and one-click test accounts. All of them have been removed — they are not
> appropriate for a public deployment. For local development, seed password
> accounts with `supabase/seed_test_users.sql` (dev databases only).

## Role selection (`pages/RoleSelection.tsx`)

New users who authenticate without an existing profile become "pending" and are
routed to `/select-role`. They pick one of the six non-admin roles (ADMIN is
never self-selectable). The screen warns that the role can't be changed later
(though `switchMyRole` and admin tools technically can change it). Cancelling
logs the user back out.

## Session model (`services/authService.ts`)

`authService` is a small module-level pub/sub store (not React context):

- **`subscribe(listener)`** — `Layout` uses this to react to auth changes.
- **`getCurrentUser()`** — synchronous in-memory user, used by `PrivateRoute`.
- **`restoreSession()`** runs on import: it clears any stale `pithi_mock_user`
  key left by an old build, then reads the Supabase session and loads the
  matching `public.users` profile.
- **Super-admin auto-promotion**: the address in `VITE_SUPER_ADMIN_EMAIL` is
  auto-created/upgraded to `ADMIN` on sign-in. It has **no default** — leave it
  unset and no account is auto-promoted. The database must agree; see
  `supabase/migrations/006_configurable_super_admin.sql`.
- **Registration helpers**: `loginUser`, `completeRegistration`,
  `getPendingUser`, `isRegistrationPending`, `logout`.
- **Admin management**: `getAdmins`, `addAdminByEmail`, `removeAdmin`,
  `switchMyRole`, `getUsers`, `getUserById`, `isSuperAdmin`,
  `isSuperAdminEmail`.

### A note on "local mode"
Several services (`dataService`, `chatService`, `notificationService`,
`geminiService`, `storageService`) still branch on a `pithi_mock_user`
localStorage key and fall back to simulated data. **That path is vestigial:**
nothing writes the key any more, and `restoreSession()` deletes it on startup,
so the branches are never taken. Treat them as dead code pending removal, not
as a supported offline mode.

## Routing & access control (`App.tsx`)

- `HashRouter` (URLs like `/#/marketplace`) so the app can be served as static
  files.
- Every route renders inside `Layout`; authenticated routes also wrap in
  `PrivateRoute`.
- **`Layout` is the real guard.** It shows a spinner until auth initializes, then:
  - Pending registration → forced to `/select-role`.
  - No user on a non-public path → redirected to `/login`
    (public paths: `/welcome`, `/login`, `/guide`, `/invitation/:id`).
  - Logged-in user on `/login` or `/select-role` → redirected to `/`.

> **Note:** role-specific pages (`/organizer`, `/owner`, `/vendor`, `/admin`) are
> guarded by `RoleRoute`, and `/vendor` accepts the four vendor roles **plus
> `ORGANIZER`**, who sells a coordination service in the same marketplace. Which
> portal a role *should* use is
> enforced by navigation visibility, not by the route itself. The real
> data-level protection is Supabase RLS (see `database-and-security.md`).

## Role-based navigation

Both the desktop sidebar and the mobile bottom bar build their items from the
current role:

| Role | Sees (besides Dashboard + Community) | Marketplace | Admin |
|------|--------------------------------------|-------------|-------|
| `GENERAL_USER` | My Events (`/owner`) | ✅ | — |
| `ORGANIZER` | Manage Events (`/organizer`) + Services (`/vendor`) | ✅ | — |
| Vendors | Services (`/vendor`) | ❌ hidden | — |
| `ADMIN` | System Admin (`/admin`, desktop only) | ✅ | ✅ |

**Bookings (`/bookings`) and Messages (`/messages`) are in the navigation for
every role** — the client side of a booking used to be reachable only through the
dashboard activity feed, which is why a booked user could not open, check,
correct or discuss what they had booked. Messages carries an unread badge fed by
`getUnreadMessageCount` and Supabase Realtime.

The mobile bottom bar caps at five items.

## Global dialogs (`contexts/GlobalDialogContext.tsx`)

A promise-based modal system replaces native `alert`/`confirm` app-wide:
`showAlert(title, message, variant?)` → `Promise<void>` and
`showConfirm(title, message, variant?)` → `Promise<boolean>`, consumed via the
`useGlobalDialog()` hook. Variants (`info`/`success`/`warning`/`danger`) pick the
icon and button styling; default buttons are Khmer (`យល់ព្រម` OK / `បោះបង់`
Cancel).

## Demo / local mode (vestigial)

The service layer still contains a "local mode" branch: when a `pithi_mock_user`
exists in localStorage, data reads/writes go to seeded localStorage records,
image uploads become base64 data URLs, and AI calls return canned responses.

**Nothing enables it any more.** The test accounts and email registration that
used to write that key are gone, and `restoreSession()` deletes the key on
startup. Running PITHI now requires a configured Supabase project.

What *does* still apply is the **error fallback**: a real session that hits a
Supabase/RLS/network error degrades to local data for that call rather than
hard-crashing the UI. That masks backend misconfiguration — if the app shows
plausible data that never persists, check the browser console.
