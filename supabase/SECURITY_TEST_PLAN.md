# Required RLS acceptance test matrix — do not skip

Status: **PARTIALLY VERIFIED — TEST DATABASE ONLY (2026-11-03).** The Supabase Free test project `household-budget-app-test` exists in us-east-1, with five migration files applied. SQL-level role simulation was performed inside transactions using three fictional Auth fixture users and then `ROLLBACK` to leave the project empty. **Real browser Auth with separate user sessions, concurrency, disaster recovery and client-side permissions have NOT yet been acceptance-tested.** Static tests and SQL role simulation are not substitutes for complete live-client testing.


## Completed SQL checks — 2026-11-03

All SQL fixture tests were run in transactions with rollback (no persistent QA users/data):

- Private, balance-only, summary, and full account-sharing rows behaved as designed across member A, member B and outsider C.
- Raw journal transactions were hidden for balance-only and summary-only sharing.
- The outsider could not read any household data or accounts.
- Direct authenticated account balance updates and ledger writes were denied by grants.
- Household creation, private account creation, one-time invitation issuance and redemption, invite reuse denial, outsider denial, and two-member household capacity logic passed.
- Public RPC forwarding functions were smoke-tested after moving SECURITY DEFINER implementations into the non-exposed `private` schema.
- Manual income, expenses, atomic transfer legs, replay idempotency, mismatched replay rejection, unauthorized account writes and visibility audit passed.
- Account starting balances (including negative amounts) did not count as income and were locked after the first transaction.
- Column-level grants disallow access to `opening_balance_cents` and client operation identifiers even where an account's balance may be shared.
- Supabase security advisor currently reports one *informational* lint: `public.household_invites` intentionally has RLS enabled with **no policies** (deny all direct reads); invitations are accessed only through authorized RPCs.

**Still required before real financial data:** end-to-end phone/desktop Auth sessions, email confirmation and callback URL configuration, two actual independent authenticated users, concurrency tests for simultaneous deposits/transfers, backups that are safely restorable without leaking account data, recovery from Free-tier suspension, browser UI privacy checks and dependency/security audits.

## Fixtures

Create three real Supabase Auth test users via test environment: Member A, Member B, and Outsider C. Give A and B membership in one household; do not add C. Include:
- A personal account: private
- B personal account: private
- Two shared accounts: Bill-Pay and Groceries
- Seeded ledger entries in each account using privileged fixture setup
- For additional cases, A personal visibility set to balance, summary and full (through *trusted test setup only*, not unrestricted public writes)
- A second isolated household if testing tenant isolation

Use the Supabase local emulator / PostgreSQL RLS test harness so every query executes as its authenticated test user, with no service-role credentials in the browser.

## Must-pass assertions

| ID | Scenario | Required |
| --- | --- | --- |
| P1 | A reads A private account and ledger entries | Allowed |
| P2 | B reads A private account or entries | Both denied |
| P3 | C reads A/B private/shared accounts or household roster | Denied |
| P4 | B reads A account with balance-only sharing | Account row visible; raw entries denied |
| P5 | B reads A account with summary sharing | Account row visible; raw entries denied |
| P6 | B reads A account with full sharing | Account row and entries visible, but no ability to edit |
| S1 | A/B read Bill-Pay and Groceries account rows + entries | Allowed |
| S2 | A/B attempt to change shared balance directly via Data API | Denied |
| S3 | B attempts to change A's personal account or ledger | Denied |
| S4 | Anonymous request selects any account or entry | Denied |
| M1 | Unauthenticated user calls create_household | Denied |
| M2 | Authenticated A creates household and two shared accounts | Allowed, exactly two |
| M3 | A generates invite token | Allowed |
| M4 | B redeems invite once | Allowed |
| M5 | C tries redeemed/expired/unrecognized code | Denied |
| M6 | Two simultaneous join requests for last seat | At most one succeeds |
| M7 | A attempts to create second household | Denied |
| M8 | B attempts to invite third person into full household | Denied |
| L1 | A/B attempt to insert/update/delete ledger rows directly | Denied |
| L2 | A/B attempt to alter cached account balances directly | Denied |
| L3 | Existing account and member queries with invalid session | Denied |

## Exit gate before using real money

1. Run the migration against an isolated test Supabase project.
2. Run every row in this matrix with independently authenticated clients.
3. Confirm auth cookie refresh and sign-out on real mobile Chrome and desktop Chrome.
4. Run dependency audit and verify email confirmation and password recovery flows.
5. Implement atomic, ledger-backed currency transaction RPCs and validate that transfers never count as expenses; test concurrent updates and reconciliation.
6. Configure backup/recovery and an incident rollback path.
7. Only then enable production financial recording and real bank integrations. The browser-local demo must not be mistaken for real account data.

## Security design notes

- Auth is the source of user identity; never trust client-supplied user IDs.
- Session checks use verified JWT claims; data access is subject to PostgreSQL RLS.
- Personal accounts are private by default; an owner may eventually enable sharing only via an audited, narrow control.
- Invites are one-time, 48-hour, cryptographically random codes. Persist only their SHA-256 hash.
- Table writes are revoked for `authenticated` and `anon`. Atomic, idempotent money-safe mutation RPCs are now installed in the **test** database, but are not authorized for production financial use until independent end-to-end verification.
- Views or aggregate reports added later must never bypass permissions for balance-only or summary sharing.
