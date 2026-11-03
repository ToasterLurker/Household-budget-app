# Household Budget App

**Checkpoint 1 — UI scaffold (not deployed).**

Private, mobile-first household budgeting web app for two members who keep personal finances separate and jointly fund Bill-Pay and Groceries.

## Current functionality

- Next.js App Router, TypeScript, Tailwind CSS 4
- Responsive Home, Accounts, Transactions, Contributions, Savings and Settings routes
- Fictional demo account balances and example transactions
- Basic structure tests and lint/typecheck scripts
- Project development rules in [AGENTS.md](AGENTS.md)

**No real data is stored.** Authentication, bank connections, financial calculations, editing and deployment have not been implemented.

## Run on a cloud development environment

1. Open the repository with Codex Cloud or another Node.js cloud workspace.
2. Run `npm install`.
3. Run `npm run dev` to start the development server.
4. Preview the workspace's forwarded web server.
5. Validate with `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

These checks have been configured but **have not yet been run** by this chat session. Please verify them in a working Node.js environment before considering Checkpoint 1 complete.

## Next checkpoint

After visual review, add real data storage and authentication with privacy boundaries and money-safe integer-cent calculations. Keep bank syncing and advanced forecasts for later checkpoints.

Never commit secrets or enter real financial data in the demo.
