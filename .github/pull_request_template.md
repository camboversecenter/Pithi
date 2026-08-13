## What does this change?

<!-- A short description of the change and why it is needed. -->

## Why?

<!-- The problem being solved. Link any related issue: Fixes #123 -->

## How was it tested?

<!-- Describe what you actually exercised in the running app, not just the build. -->

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Tested the affected screen(s) in the app

## Screenshots

<!-- Before/after for anything visual. Delete this section if not applicable. -->

## Database changes

<!-- Delete this section if the change does not touch the database. -->

- [ ] Added as a **new numbered migration** in `supabase/migrations/`
- [ ] Idempotent and non-destructive (safe to re-run, drops no user data)
- [ ] Row-Level Security enabled with explicit policies on any new table
- [ ] `RUN_ALL.sql` regenerated
- [ ] No email address, project URL, or key hardcoded
