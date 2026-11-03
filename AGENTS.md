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
