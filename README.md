# Household Budget App

> **Permanent project constraint: $0 in mandatory ongoing expenses.** Hosting, account storage, maintenance, reporting and core budgeting functions must operate without subscription fees, paid APIs or required upgrades. See [Zero-Cost Operating Policy](docs/ZERO_COST_POLICY.md). Vendor free tiers may change, so portable data and a free/local fallback are design requirements.

A responsive, Chrome-first household budgeting web application for two people with independent personal money and shared Bill-Pay / Groceries accounts.

## Checkpoint 4 — Zero-cost portable demo backups and secure backend preparation

**Status: Code deployed, external database not yet connected, live RLS checks not yet run.**

The interactive fictional-data demo now includes:
- **JSON backups:** download a portable file containing all current demo transactions and transfers
- **Restore:** validate and restore a JSON backup after confirming replacement of existing demo activity
- **CSV exports:** export a spreadsheet of recorded activity without any third-party service
- Record demo expenses/income and transfers without counting transfers as expenses
- See separate account balances and weekly contributions
- Undo entries and persist fictional entries in the same browser's local storage

A separate secure workspace is now prepared at `/secure`:
- Supabase email/password sign-in and confirmation callback, using cookie-based SSR
- Verifiable sessions via `getClaims()` and Next.js 16 proxy session refresh
- SQL migration for profiles, household memberships (maximum two), two shared accounts, private personal accounts, and read-only ledger journal
- PostgreSQL RLS restricting every table; separate account-row and transaction-history visibility
- Owner/member-only creation routines and one-use cryptographically random partner invitations
- No direct client writes to account balances or journal records
- Graceful, explicit setup screen if Supabase environment details are missing

**The secure workspace is in staging and must not be used for real finances yet.** Its database permissions must be tested against independent user identities; the live ledger still has no production mutation APIs.


For backup format and security caveats, read [Data Portability](docs/DATA_PORTABILITY.md). All backup and export features are free, run inside the browser, and are **for fictional demo data only**. The stable live site is hosted on a free Vercel URL; third-party hosting policies can change.

## Setup

See [docs/SETUP_SUPABASE.md](docs/SETUP_SUPABASE.md) for required project setup, [supabase/SECURITY_TEST_PLAN.md](supabase/SECURITY_TEST_PLAN.md) for the test matrix, and [AGENTS.md](AGENTS.md) for product rules.

Never commit service-role keys, database passwords, live personal bank records, or secrets. Public Supabase keys do not bypass RLS.

## Test and build

In a Node.js 22+ workspace:

```bash
npm install
npm run test
npm run typecheck
npm run lint
npm run build
```

The deployment system runs those checks before the Next.js production build.

## Next checkpoint

Provision a test Supabase instance, apply the migration, verify all RLS cases and auth flows. Then implement audited, atomic, integer-cent journal mutation functions and account-level visibility changes before allowing real financial entries.
