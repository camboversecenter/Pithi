# Security Policy

## Reporting a vulnerability

**Please do not report security issues in public GitHub issues, pull requests,
or the community feed.** Public disclosure puts PITHI users at risk before a fix
can be shipped.

Instead, report privately through **GitHub Security Advisories**:

1. Go to the [Security tab](https://github.com/camboversecenter/Pithi/security)
   of this repository.
2. Choose **Report a vulnerability**.
3. Describe the issue, the impact, and how to reproduce it.

If you cannot use GitHub Security Advisories, email the maintainers privately at
**[pithi.deva@gmail.com](mailto:pithi.deva@gmail.com)** with `SECURITY` in the
subject line.

### What to include

- What the issue is and which part of the app or database it affects.
- Steps to reproduce, ideally with a minimal example.
- The impact — what an attacker could read, change, or break.
- Any suggested fix, if you have one.

### What to expect

- We aim to acknowledge a report within **7 days**.
- We will keep you updated while we investigate and prepare a fix.
- With your permission we will credit you when the fix is released.

Please give us a reasonable opportunity to fix the issue before disclosing it
publicly.

## Scope

PITHI is a client-side application that talks directly to Supabase, so the
security boundary is the **database**, not the browser. Reports in these areas
are especially valuable:

- **Row-Level Security gaps** — any way to read or modify data belonging to
  another user, ceremony, or vendor.
- **Privilege escalation** — any way to obtain the `ADMIN` role, or to act
  beyond your assigned role.
- **`SECURITY DEFINER` functions** — any function callable from the browser that
  does more than it should for the calling user.
- **Storage** — access to files (receipt images, banners) beyond what the
  uploader intended.
- **Authentication** — anything that bypasses Google sign-in or lets one account
  act as another.

### Not vulnerabilities

- **The Supabase anon/publishable key being public.** This key is designed to
  ship in the browser bundle; it identifies the project but grants no access on
  its own. Data is protected by Row-Level Security. A *missing or broken RLS
  policy* is a vulnerability — the key being visible is not.
- Issues that require an already-compromised device, browser, or Google account.
- Missing hardening headers with no demonstrated impact.

## For people deploying PITHI

If you run your own instance, please:

- keep **Row-Level Security enabled on every table** — run
  `supabase/migrations/RUN_ALL.sql` and check the Supabase security advisors;
- keep secrets such as `GEMINI_API_KEY` and the service-role key in Edge
  Function secrets, **never** in `VITE_*` variables, which are public;
- set your own super administrator with
  `select public.set_super_admin_email('you@example.com');`
- never run `supabase/seed_test_users.sql` against production — it creates
  shared-password accounts and is for local development only.
