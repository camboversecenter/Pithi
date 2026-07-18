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

## Sign-in options (`pages/Login.tsx`)

The login screen is deliberately a **public interactive demo** and offers four
parallel ways in:

1. **Email sign-in / sign-up** — a tabbed form (`ចូលគណនី` Sign In /
   `បង្កើតគណនី` Sign Up). Sign-up requires a full name; on success it switches
   you back to the sign-in tab. Supabase error strings are translated to Khmer
   (invalid credentials, email already registered, password too short).
2. **Real Google OAuth** — `supabase.auth.signInWithOAuth` with
   `redirectTo: window.location.origin`. The Supabase client uses the **PKCE
   flow** so the OAuth result comes back as a `?code=` query param rather than a
   `#access_token` hash fragment (which would collide with the hash router).
   Making real Google sign-in work also requires dashboard configuration —
   see [google-signin-setup.md](google-signin-setup.md).
3. **Google "simulator"** — a consent-bypass form (defaulting to the admin
   identity `pithi.deva@gmail.com`) for demoing the OAuth flow when a real Google
   project isn't configured. There is also an inline troubleshooting guide for
   Google's *Error 403: org_internal*.
4. **Seven one-click test accounts** — one per role, all using password
   `password123`. These authenticate entirely client-side (see Demo mode below).

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
- **`restoreSession()`** runs on import: a `pithi_mock_user` in localStorage wins
  over any Supabase session; otherwise it reads the Supabase session and loads
  the `public.users` profile.
- **Super-admin auto-promotion**: anyone signing in as `pithi.deva@gmail.com` is
  auto-created/upgraded to `ADMIN`.
- **Registration/login helpers**: `loginWithEmailAndPassword`,
  `registerWithEmailAndPassword`, `simulateGoogleLogin`, `completeRegistration`,
  `getPendingUser`, `isRegistrationPending`, `logout`.
- **Admin management**: `getAdmins`, `addAdminByEmail`, `removeAdmin`,
  `switchMyRole`, `getUsers`, `getUserById`, `isSuperAdmin`.

### localStorage keys used by auth
- `pithi_mock_user` — the active demo/mock session (a full `User`). Its presence
  puts the whole app into "local mode".
- `pithi_local_registered_users` — registry of locally email-registered users
  (used so the demo works even if Supabase blocks email confirmation).

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
> only guarded by "is *any* user logged in." Which portal a role *should* use is
> enforced by navigation visibility, not by the route itself. The real
> data-level protection is Supabase RLS (see `database-and-security.md`).

## Role-based navigation

Both the desktop sidebar and the mobile bottom bar build their items from the
current role:

| Role | Sees (besides Dashboard + Community) | Marketplace | Admin |
|------|--------------------------------------|-------------|-------|
| `GENERAL_USER` | My Events (`/owner`) | ✅ | — |
| `ORGANIZER` | Manage Events (`/organizer`) | ✅ | — |
| Vendors | Services (`/vendor`) + Bookings (`/bookings`) | ❌ hidden | — |
| `ADMIN` | System Admin (`/admin`, desktop only) | ✅ | ✅ |

The mobile bottom bar caps at five items.

## Global dialogs (`contexts/GlobalDialogContext.tsx`)

A promise-based modal system replaces native `alert`/`confirm` app-wide:
`showAlert(title, message, variant?)` → `Promise<void>` and
`showConfirm(title, message, variant?)` → `Promise<boolean>`, consumed via the
`useGlobalDialog()` hook. Variants (`info`/`success`/`warning`/`danger`) pick the
icon and button styling; default buttons are Khmer (`យល់ព្រម` OK / `បោះបង់`
Cancel).

## Demo / local mode (important)

The app is built to run with **no backend at all**. When a `pithi_mock_user`
exists in localStorage:
- All data reads/writes go to localStorage with seeded demo records.
- Image uploads become base64 data URLs.
- AI calls return canned local responses.

Test accounts and locally-registered users authenticate fully client-side, and
even a real session falls back to local mode on any Supabase/RLS/network error —
so the UI never hard-crashes during a demo.
</content>
