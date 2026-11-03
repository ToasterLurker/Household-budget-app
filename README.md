# Household Budget App

> **Permanent requirement: $0 in mandatory operating or maintenance costs.** See [Zero-Cost Operating Policy](docs/ZERO_COST_POLICY.md). Never introduce paid hosting, required bank data APIs, billable AI services, paid notifications, or mandatory upgrades. Provider free tiers are not guaranteed forever; preserve portable data and migrations.

Private, Chrome-first household budgeting web app for two people, with independent personal accounts and two shared accounts (Bill-Pay and Groceries).

## Version 0.5 — Secure multi-user test foundation

**Test database connected, production real-finance use NOT authorized.**

### Free browser-only demo
- Home, Accounts, Transactions, Contributions, Savings and Settings
- Record fictional purchases, income, and transfers; shared contributions are transfers, not spending
- Separate balances, sample weekly contributions and optional demo activity
- Local browser persistence and **free JSON backup/restore and CSV export**
- No account required, no real financial data

### Secure household test workspace
- Supabase Free project `household-budget-app-test` in us-east-1, under HomeBudgeting
- Email/password authentication code and Next.js cookie-based session handling
- Owner-controlled private, balance-only, summary or full read-only personal visibility
- Two shared household accounts; 50/50 contribution logic to be implemented later
- Cryptographically random one-use partner invitations
- Atomic signed-in manual income/expense/transfer routines, integer cents, paired transfer journal entries
- Idempotent transaction operations so identical retries do not charge accounts twice
- Account-specific initial balances, not classified as income; locked after first transaction
- Audit trails for personal visibility and starting-balance changes
- Read-only authorized journal history and account-level RLS with column-level privilege minimization

### Security limitations
- **Never enter real bank account details, personal balances or actual transaction histories in this test workspace.**
- SQL role simulation has validated household privacy, owner-only edits, denied outsider access, invitation use, transfer idempotency and starting-balance controls.
- Actual end-to-end browser Auth confirmation, concurrent requests, full backup/recovery and live two-member acceptance tests are **still pending**.
- The temporary project can pause due to Supabase Free inactivity; never depend on its availability without export/recovery.

## Get started

- Demo: https://household-budget-app-gold-iota.vercel.app
- Secure test workspace: https://household-budget-app-gold-iota.vercel.app/secure
- Authentication setup: [Test Login Setup](docs/TEST_LOGIN_SETUP.md)
- Database migrations: `supabase/migrations/`
- Security checklist: [Security Test Plan](supabase/SECURITY_TEST_PLAN.md)
- Portable demo backups: [Data Portability](docs/DATA_PORTABILITY.md)
- Agent rules: [AGENTS.md](AGENTS.md)

## Build checks

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

The deployed secure workspace must not be treated as production-safe until all tests and authenticated backup/restore flows pass.
