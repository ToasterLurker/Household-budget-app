# Household Budget App

A private, Chrome-first household budgeting Progressive Web App project. This is a **fictional, local-only demonstration** while the secure backend is being designed.

## Checkpoint 2 — Interactive demo

- Responsive Next.js App Router, TypeScript, Tailwind CSS interface
- Home, Accounts, Transactions, Contributions, Savings, and Settings pages
- Money-safe demo ledger using **integer cents**, never floating-point transaction amounts
- Manual demo purchases and deposits update their example account balance immediately
- Manual transfers subtract from one example account and add to the other, without counting as spending
- Weekly 50/50 *example* contribution targets to two separate shared accounts; record the displayed person's contribution as a transfer
- Remove demo entries to reverse their effect on example balances
- Data persists in **this browser's localStorage only**, not a server or another phone
- Automated tests for rounding, transfer integrity, weekly contributions, data validation, and page structure

This is a demonstration, **not a production financial service**. Do not enter real personal information or bank account details. There is no authentication, bank synchronization, server-side ledger, financial forecasting, or multi-user visibility control yet. The savings page is a placeholder.

## Run or verify

In a Node.js 22+ environment:

1. `npm install`
2. `npm run test`
3. `npm run typecheck`
4. `npm run lint`
5. `npm run build`
6. `npm run dev` for local preview

No tokens or credentials should be committed. The first deployment uses direct file uploads to Vercel, not an automated GitHub project link.

## Next checkpoint

Implement secure authentication, a server-side account and transaction model, household membership with access controls, and tests proving personal accounts are private. Do not allow real finances to be recorded until those features are verified.

Read [AGENTS.md](AGENTS.md) for permanent product invariants.
