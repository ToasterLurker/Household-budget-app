# Agent instructions — Household Budget App

## Current objective
Develop a secure, mobile-first browser-based Progressive Web App for a two-person household. Deliver small, testable checkpoints. **Checkpoint 1** is a scaffold and clickable demo UI with fictional data only. Do not connect real financial data.

## Agreed financial behavior
- Each member owns their personal income and money; there are no mandatory personal spending category budgets.
- Shared bill-pay and grocery accounts have separate balances and 50/50 weekly contributions, provisionally Fridays.
- Transfers between accounts are not expenses. Scheduled contributions are not confirmed deposits.
- Both household members can approve shared budget changes; changes require an audit history.
- Personal accounts default to private. Each owner chooses which balances/summary/transactions can be viewed by the other. Shared account data is visible to both.
- Unused personal discretionary money rolls forward; optional virtual or real savings and goals are opt-in.
- Manual purchases reduce app-calculated available money immediately. Eventual bank sync reconciles duplicates; any discrepancy in manually entered vs bank amount requires manual review.
- Automatic transaction categories support user-approved persistent rules. Automatically detected recurring expenses feed forecasts.
- Expected cash-flow is primary; conservative scenario is separate. Shortage alerts should be deduplicated.
- Calendar and continuous cash-flow graph show separate account balances and honor privacy; historical vs projected data must be visually distinct.

## Security and implementation
- No credentials, API keys, secrets, raw bank data, or private financial information in Git.
- Authorization must be enforced server-side / at data access, not by hiding UI controls.
- Use fixed-precision currency values (integer cents); avoid floating-point account math.
- Never represent demo data as real money.
- Future features need tests for transfers, recurring events, privacy, reconciliation, and account-level shortages.

## Checkpoint 1 scope
Scaffold Next.js App Router + TypeScript + Tailwind with accessible responsive navigation and demo-only screens: Home, Accounts, Transactions, Contributions, Savings, Settings. Add lint/typecheck/tests and a README with cloud setup instructions. Keep dependencies minimal. Run checks. Report what passes. Stop before authentication, banking integrations, financial calculations, notifications, or deployment involving real data.
