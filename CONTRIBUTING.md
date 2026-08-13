# Contributing to PITHI

Thanks for your interest in PITHI (ពិធី). It is a free community project for
planning traditional Cambodian ceremonies, and contributions of every size are
welcome — code, documentation, translations, design, and bug reports alike.

By participating you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug** — open an issue using the *Bug report* template.
- **Suggest a feature** — open an issue using the *Feature request* template.
- **Improve the docs** — everything in `docs/` and the in-app guide
  (`pages/UserGuide.tsx`) can always be clearer.
- **Translate** — the interface is Khmer-first with English alongside. Help us
  keep both accurate.
- **Write code** — see below.

## Getting set up

**Prerequisites:** Node.js 18+ and a free Supabase project.

```bash
git clone https://github.com/camboversecenter/Pithi.git
cd Pithi
npm install
cp .env.example .env.local     # then fill in your own Supabase values
npm run dev
```

To create the database, run `supabase/schema.sql` in the Supabase SQL Editor,
then `supabase/migrations/RUN_ALL.sql`. Both are idempotent and non-destructive.
Full instructions, including Google sign-in setup, are in the
[README](README.md#run-locally).

> **Use your own Supabase project.** Never point a development build at a
> production database, and never commit real credentials — `.env.local` is
> git-ignored for this reason.

## Before you open a pull request

1. **Type-check and build** — CI runs the same commands:
   ```bash
   npm run lint     # tsc --noEmit
   npm run build
   ```
2. **Test what you changed** in the running app, not just the build.
3. **Keep the diff focused.** One concern per pull request is much easier to
   review than a large mixed change.
4. **Match the surrounding style.** The codebase uses TypeScript, React function
   components and Tailwind utility classes; follow the conventions already in
   the file you are editing.
5. **Explain the "why"** in the pull request description, and include before/
   after screenshots for anything visual.

## Database changes

Schema changes ship as a **new numbered file** in `supabase/migrations/`
(for example `007_my_change.sql`). Please:

- make them **idempotent** (`create ... if not exists`, `create or replace`,
  `drop policy if exists`) so they can be re-run safely;
- make them **non-destructive** — never drop a user's data;
- enable **Row-Level Security** on any new table and add explicit policies,
  since the anon key is public and RLS is what actually protects the data;
- regenerate `RUN_ALL.sql` by concatenating the migrations in dependency order,
  so a fresh database can be set up in one paste.

Never hardcode an email address, project URL, or key in a migration. Deployment
specific values belong in `app_settings` (see `006_configurable_super_admin.sql`).

## Commit messages

Write a short imperative subject line describing the effect of the change, and
use the body to explain the reasoning:

```
Fix double-booking when a vendor confirms two overlapping requests

The overlap check only ran on insert, so confirming an existing PENDING
booking could still collide with a CONFIRMED one on the same day.
```

## Security issues

Please do **not** open a public issue for a vulnerability. See
[SECURITY.md](SECURITY.md) for how to report one privately.

## Licence

PITHI is licensed under the [Apache License 2.0](LICENSE). By contributing you
agree that your contributions are licensed under the same terms, including its
patent grant.
