# Required RLS acceptance test matrix — do not skip

Status: **NOT RUN**. This migration has been authored but no Supabase project, seeded users, or test database exists yet. Static source-code tests are **not** substitutes for live row-level-security tests.

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
- Table writes are revoked for `authenticated` and `anon`. At this checkpoint, no real ledger mutation RPCs are present.
- Views or aggregate reports added later must never bypass permissions for balance-only or summary sharing.
