# Supabase Free test database — current setup

**Project:** `household-budget-app-test` (Supabase project ref `xomtjnzqfxsddkmlnnqz`) under the user-selected **HomeBudgeting** organization.

**Cost checked:** $0/month under the organization's free plan. No paid upgrades were enabled.

**Status (2026-11-03):** Project ACTIVE_HEALTHY, us-east-1. Database schema, household RLS, private operations, atomic ledger RPCs, starting-balance controls and column-level grants applied successfully. Vercel environment variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_ORIGIN` configured in production/preview without administrator keys.

## Required user step: Supabase Auth URL Configuration

See [TEST_LOGIN_SETUP.md](TEST_LOGIN_SETUP.md). Set Supabase **Authentication → URL Configuration**:
- Site URL: `https://household-budget-app-gold-iota.vercel.app`
- Redirect URL: `https://household-budget-app-gold-iota.vercel.app/auth/callback`

This requires a one-time action in the Supabase dashboard; the current connector cannot change the Auth URL allowlist. Keep email confirmation on. Do not send login credentials or secrets to ChatGPT.

## Completed development

- Backend RLS: own-private vs shared visibility; private account activity excluded from balance/summary permissions.
- Separate personal/account membership. Maximum two members per household.
- Two zero-balance shared accounts upon household creation.
- One-use invitation codes (cryptographically random, hashed at rest and time-limited).
- Signed-in server actions for test-only income, expenses, transfers, starting balances and privacy settings.
- Atomic ledger operations with idempotency guard against repeated submissions.
- Tests using three fictional SQL role-simulation identities passed, leaving zero test users and rows after rollback.
- Source code, schema migrations, and extensive acceptance checklist committed to GitHub.
- Deployment build/test/typecheck/lint succeeded for the staged secure workspace.

## Still blocked from real financial use

- Two independent phone/desktop browser accounts and actual Auth callback testing
- Email confirmation and password recovery verification
- Concurrent access/transfer correctness under load
- Real-user permission tests beyond simulated Postgres RLS
- Secure authenticated export, import and reliable recovery
- No-cost fallback for Supabase Free project pauses
- True savings, contributions, financial calendar, reconciliation and optional free statement imports

Never enter real personal financial data or banking credentials in this test workspace until those gates pass.

## Security and pricing

- **Never** place database passwords, Supabase service role/secret keys or other privileged credentials in `NEXT_PUBLIC_*` environment variables.
- Publishable keys are safe only because database RLS and narrow RPC authorization enforce account access.
- Monthly cost remains $0 within the published Supabase Free quotas. No provider can guarantee indefinite free hosting; portability remains mandatory.
- [Zero-cost operating policy](ZERO_COST_POLICY.md) is a permanent development constraint.
