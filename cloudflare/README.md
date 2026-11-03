# Household Budget — Cloudflare-only version

**Status: Cloudflare migration code committed; NOT yet deployed or linked to a Cloudflare account.** The existing Vercel demo continues to operate while this replacement is tested.

## Why Cloudflare?

One application platform handles:
- Responsive static website (Workers Static Assets)
- Private API and server-side business rules (Workers)
- Two-person household database (D1 / SQLite)

GitHub stores the code; it is not a runtime dependency. The intention is to **replace Vercel and Supabase**, not keep a third provider in the operating stack. No paid services, banking API subscriptions, custom domains, or external authentication providers are required.

## What is implemented now?

- New responsive demo UI, separate from the Next.js version
- Functional demo transactions, income, transfers, and weekly contributions in browser-local storage
- JSON backup/restore compatible with the original demo, plus free CSV export
- Cloudflare Worker router that **refuses every private API route** until login security is ready
- D1 schema for users, passkeys, recovery codes, sessions, household membership, personal/shared accounts, one-time invitations, and an immutable double-entry-equivalent transfer ledger
- SQL constraints/triggers for owner-only personal ledger changes, household boundaries, source-account funds checks, two-member maximum, immutable journal and idempotency
- Tests of the Worker fail-closed behavior and SQLite/D1 ledger constraints

**Not implemented yet:** passkey enrollment/authentication, actual authorized API endpoints, shared live data syncing, recurring bills, bank imports, savings engine, privacy-aware cash-flow graph and real financial backups. Do not enter actual finances. The D1 schema alone is not authorization: all future API queries must verify the member's passkey session and account permissions.

## Mobile-friendly first deployment (one-time)

There is no direct Cloudflare connection in this ChatGPT session. Deployment therefore requires one Cloudflare account and connecting this existing GitHub repository **once**:

1. Go to https://dash.cloudflare.com/ and select the **Free** plan. Do not enable Workers Paid or add a payment method for this project.
2. Open **Workers & Pages → Create application → GitHub**.
3. Link the GitHub account and select `ToasterLurker/Household-budget-app`.
4. Choose **Worker name**: `household-budget` (must match the name in `wrangler.jsonc`).
5. Configure the **Root directory** as `cloudflare`.
6. Set the **Build command** to `npm run check` so tests and the asset build must succeed.
7. Set the **Deploy command** to `npm run deploy`. This deploys the Worker, automatically provisions its D1 binding if necessary, and applies versioned SQL migrations.
8. Keep the branch `main`, and confirm the deployment. The final URL will be on your free `workers.dev` subdomain.

If Cloudflare's dashboard uses different labels or errors, do not switch plans. Stop and send the dashboard screenshot instead. Cloudflare's Git integration will then handle subsequent deployments from the repository; your phone doesn't need to run code or store API tokens.

**Migration script note:** Cloudflare's beta automatic resource provisioning for D1 is used intentionally (no database ID committed). The deploy command assumes the named database `household-budget-data` becomes available after `wrangler deploy`. Check the first build log for a provisioning confirmation and successful `d1 migrations apply`. If it does not, the versioned migration must be applied through Cloudflare's free D1 dashboard or Wrangler, never by granting unrestricted database access to users.

## Local developer commands (optional)

From this `cloudflare/` folder on a computer or a cloud workspace:

```sh
npm install
npm run check
npm run dev
```

Deploying requires Cloudflare authorization and the **Free** Workers plan:

```sh
npm run deploy
```

No local computer is required for ordinary users.

## Zero-cost and recovery guardrails

At the time of development, Workers Free provides 100,000 requests/day. D1 Free includes up to 5 million rows read/day, 100,000 rows written/day and 5 GB total storage, with a smaller per-database cap (currently 500 MB). Hitting the free limits should stop queries rather than incur an unexpected bill.

The use of Cloudflare does **not** guarantee perpetual free hosting or storage. Keep portable schema migrations, free authorized JSON/CSV export and a plan to move to free/local hosting if terms change. Never allow production data until a usable encrypted/recoverable backup process is tested.

See the root [zero-cost policy](../docs/ZERO_COST_POLICY.md).
