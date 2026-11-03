# Agent instructions — Household Budget App

## Product invariants
- Each person keeps unrestricted personal money; there are no mandatory individual spending limits.
- Joint Bill-Pay and Groceries accounts are separate real bank accounts in the eventual product. Weekly agreed contributions are 50/50, provisionally on Fridays.
- Transfers between accounts are **not expenses**. Planned contributions are not funded transfers.
- One household member can approve shared contribution changes, which must be audited and communicated to both.
- Personal accounts default to private, owner-only editing. Owner-selectable visibility: private, balance-only, summary, full read-only. Shared accounts are visible to both members.
- Unspent personal money carries forward; personal savings goals are optional.
- Real manual purchases immediately affect app-calculated availability, eventually reconciled against bank transactions without double counting. Even a $0.01 mismatch needs manual review.
- Money uses **integer cents** in all real account and transaction logic.
- Conservative forecasts are warnings, not deductions from normal expected spending.
- Historical and future cash-flow graphs have separate lines for separate authorized accounts.

## Development stages
- Checkpoint 1: responsive demo shell.
- Checkpoint 2: interactive **fictional**, browser-local expense/income/transfer ledger.
- Checkpoint 3: secure auth and household scaffolding, Supabase SQL migration and RLS test plan. **Auth/database not connected yet. No real financial data.**
- Checkpoint 4: test Supabase project, live RLS acceptance tests, two-user sign-in, zero-balance account setup.
- Later: transactional money ledger RPC, real bank integration, cash flow, calendar, forecast, notifications.

## Security rules
- Never commit or request secrets, service-role keys, bank passwords, or actual bank transaction datasets.
- Browser-only demo state is not secure or synchronized across devices.
- Every exposed DB table requires explicit grants + RLS. No cross-user leak through reports/aggregates/notifications.
- SQL SECURITY DEFINER functions must have fixed search_path and explicit authorization checks.
- The new secure mode must fail closed when configuration is missing or sessions are unverified.
- Direct user writes to balances and ledger must remain disabled until audited money-safe DB RPCs exist.
- Before claiming security, run the complete live RLS matrix in supabase/SECURITY_TEST_PLAN.md.
- Run tests, typechecking, lint and build before every deployment; report what actually ran.

## Mandatory lifetime cost constraint
- **The app must remain usable and maintainable for $0 mandatory ongoing cost indefinitely.** No subscription, pay-per-call financial data provider, paid domain, premium database tier, hosted AI inference, paid notifications, or silent usage charges.
- Each development decision must pass the cost policy in [docs/ZERO_COST_POLICY.md](docs/ZERO_COST_POLICY.md). Never add billable infrastructure or a trial that can auto-upgrade.
- Bank auto-sync must be optional; manual entry and free user-controlled CSV/OFX/QFX import must work without any paid aggregator.
- Plan free export/import, user-controlled backups and portability. Supabase Free pausing/backup limitations and free host quotas must not force an upgrade.
- If a feature cannot meet zero-cost constraints, propose a free workaround or defer it. Never make users pay to preserve access to their data.

## Architecture simplification decision (2026-11-03)

The user explicitly requested to **stop relying on Supabase**, due to third-party onboarding, setup and maintenance friction. Do not continue building Supabase-dependent features or ask the user to confirm Supabase emails while this pivot is active.

**Preserve the desired product:** two independently authenticated people, separate private personal accounts, shared Bill-Pay and Groceries balances updated across devices, correct atomic transfers, private-by-default data, and a permanent **$0 mandatory recurring-cost** constraint.

Preferred candidate replacement: **a single operating provider** for the public app, server API and database, e.g. Cloudflare Workers (Static Assets + Worker API + D1). It currently offers a no-cost Workers tier and D1 storage/query quotas. Authentication and transaction integrity require a reviewed server-side design, supported sign-in and recovery, security tests, and correct transactional SQL; never substitute shared localStorage or unprotected API endpoints.

**Migration constraints:**
- Keep the present Vercel fictional demo running while a new hosting architecture is developed and validated.
- Stop sending new users to Supabase for sign-in; current secure workspace is test-only and should be deprecated after equivalent access and backup coverage exists.
- Do not delete or erase Supabase data/project without a separate, explicit user decision; historical SQL migrations in GitHub may be retained for audit but must not be reused accidentally as new backend instructions.
- Prefer minimizing operational accounts over adding numerous external services. GitHub may continue as a code repository only.
- If no unified hosting solution is approved yet, keep core work local-first, test-only and portable, while preserving the requirement for eventual safe real-time two-person sync.
- No replacement provider is authorized for paid usage, billing activation, or trial that can incur charges; free limits and exit path must be verified.
- No real financial data until independent login, private vs shared access, transfer integrity, backup and recovery are independently tested.

The Cloudflare proposal is a *candidate*; do not claim it is already connected or deployed. The existing Supabase database remains a test resource, not the chosen long-term architecture.


## Cloudflare architecture approved and in development (2026-11-03)
- The user explicitly approved migrating away from Supabase to a single Cloudflare operating platform.
- New implementation: `cloudflare/`, using Workers Static Assets (web app), Workers (API), and D1 (SQL account data). GitHub remains source control only.
- Current checkpoint: independent responsive demo frontend, D1 schema with immutable integer-cent ledger and membership safeguards. All nonpublic API routes MUST fail closed until passkey authentication and account authorization is verified.
- Do not introduce paid auth providers, billable emails/SMS, paid features, or other operating providers. Future login should use first-party passkeys, invites and free recovery codes, with recovery independently tested.
- Respect Workers Free request/CPU limits, D1 Free storage/row caps, and never enable paid upgrades.
- Keep Vercel's fictional demo available until the Cloudflare version has been deployed, independently tested, and deemed safe.
- Never apply Supabase SQL migrations to D1. Do not delete Supabase project or legacy data without explicit approval.
- Preserve original JSON demo backup compatibility; plan authenticated, encrypted/restorable backups for real data.
- Production gates: browser passkey enrollment/login/recovery, two independent identities, personal/shared authorization, concurrent transfer integrity, free export/restore, and no-cost recovery from free-tier limits.
