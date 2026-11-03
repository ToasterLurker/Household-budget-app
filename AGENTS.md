# Agent instructions — Household Budget App

## Current objective
Build a secure mobile-first browser-based budgeting app for two people. Work in small, testable checkpoints. **Checkpoint 2** introduces a client-side, interactive demonstration using fictional data only. It is not a real financial application. Preserve the existing working interface.

## Financial invariants
- Each member owns their personal money; there are no compulsory personal spending limits.
- A shared Bill-Pay account and separate shared Groceries account have independent balances and 50/50 weekly contributions, provisionally Friday.
- Transfers between accounts are not expenses. Planned contributions are not deposits until recorded.
- One household member may approve a shared contribution change, which must be logged and both members informed.
- Personal accounts are private by default, with owner-controlled balance-only, summary, or read-only transaction sharing. Shared accounts are accessible to both.
- Unspent personal money rolls forward; virtual savings and savings goals are optional.
- Manual entries immediately affect app-calculated availability. When bank sync is implemented, reconcile without double counting and require review for *any* amount mismatch, even one cent.
- Use integer cents for money calculations. No use of floating point amounts for transaction arithmetic.
- Expected cash-flow is the normal scenario; conservative forecasts show warnings separately.
- Financial calendar and timeline maintain separate account lines and honor all privacy controls.

## Safety, scope and deployment
- Do not commit passwords, raw bank data, access tokens, Supabase service role keys, or private financial information.
- Do not claim browser-only localStorage provides real authentication, server-side privacy, or multi-device sync.
- No real data until authentication, access controls, ledger integrity and relevant tests are complete.
- All sample accounts, contributions and transactions must be visibly marked as fictional.
- Future backend access must be authorized server-side and through appropriate database row-level security.
- Never silently modify shared contribution rules or personal savings targets.
- Re-run tests, TypeScript, lint, and build before each deployed checkpoint.

## Checkpoint 2 scope
Implement working demonstration forms for expenses, income, manual transfers and weekly shared contributions with local-only persistence; keep independent account balances; permit undo by removing an entry; explain demonstration limitations. Do not connect bank accounts or implement unverified authentication. Next step: secure auth/data model, then true account-level permissions and multi-user features.
