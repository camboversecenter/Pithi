# Configuring Google Sign-In

Google sign-in for PITHI has two halves: **app code** (already handled in this
repo) and **dashboard configuration** (you must set these up in Supabase and
Google Cloud). If sign-in "doesn't work," it is almost always a dashboard/config
issue — the code cannot fix those for you.

## What the code does (already in the repo)

- The Supabase client (`services/supabaseConfig.ts`) is configured with
  **`flowType: 'pkce'`** and `detectSessionInUrl: true`. This is essential:
  PITHI uses `HashRouter`, and the older implicit OAuth flow returns the session
  in a `#access_token=…` hash fragment that collides with the router hash, so the
  session is never established. PKCE returns a `?code=…` query param instead,
  which coexists with the hash router.
- `services/supabaseConfig.ts` reads `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` from the environment. There is no fallback: if they
  are unset the login screen shows setup instructions instead of a sign-in
  button.
- `pages/Login.tsx` now reads any OAuth error returned on the redirect URL
  (e.g. `access_denied`, `org_internal`) and shows it, instead of bouncing the
  user back to a blank form.
- `services/authService.ts` `loginUser()` calls `signInWithOAuth` with
  `redirectTo: window.location.origin`.

## What you must configure

### 1. Supabase → Authentication → Providers → Google
- Enable **Google**.
- Paste the **Client ID** and **Client secret** from your Google OAuth client
  (below).

### 2. Supabase → Authentication → URL Configuration
- **Site URL**: your deployed origin, e.g. `https://pithi.pages.dev`.
- **Redirect URLs**: add every origin the app is served from, e.g.
  - `https://pithi.pages.dev`
  - `https://pithi.pages.dev/**`
  - `http://localhost:5173` (for local dev)

  These must match `window.location.origin` exactly (that is the `redirectTo`
  the app sends). A missing entry here is the most common cause of a failed
  redirect.

### 3. Google Cloud Console → APIs & Services → Credentials
Create/edit an **OAuth 2.0 Client ID** (type: Web application):
- **Authorized JavaScript origins**: your app origin(s), e.g.
  `https://pithi.pages.dev`, `http://localhost:5173`.
- **Authorized redirect URIs**: the Supabase auth callback —
  `https://<your-project-ref>.supabase.co/auth/v1/callback`.

### 4. Google Cloud Console → OAuth consent screen (fixes "Error 403: org_internal")
- Set **User type** to **External** (not Internal). "Internal" restricts sign-in
  to your Google Workspace org and produces
  *"Access blocked: … can only be used within its organization"* for everyone
  else.
- While the app is in **Testing**, add each tester's Google account under **Test
  users** — or click **Publish app** to allow anyone.

## Verifying

1. Deploy (or run locally) with the env vars set.
2. Open the app and go to **Login → ចូលគណនីជាមួយ Google**.
3. You should be redirected to Google, then back to the app already signed in.
4. If it fails, the Login page now shows the exact Google/Supabase error message —
   use that to pinpoint which of the steps above is missing.

## Running without Google

There is no way around it in a deployed app — Google OAuth is the only sign-in
method. For local development you can seed password accounts into a **dev**
Supabase project with `supabase/seed_test_users.sql` and sign in through the
Supabase dashboard; see [authentication-and-roles.md](authentication-and-roles.md).
