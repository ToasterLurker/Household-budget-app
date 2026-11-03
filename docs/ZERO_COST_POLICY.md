# Zero-Cost Operating Policy

**Non-negotiable user requirement (2026-11-03): This household budgeting application must be usable and maintainable indefinitely at $0 in mandatory recurring or usage-based fees.** This is an architectural constraint, not a statement that free third-party offerings are guaranteed forever.

## Mandatory release criteria
1. Running the app for its intended two users (and adding transactions indefinitely) must require **no subscriptions, paid hosting, premium domain, credit-card-enabled overages, per-user fees, paid database tiers, paid API calls, metered AI inference, commercial license, or paid notifications**.
2. Never enable a paid service, trial that auto-converts to paid, usage-based billing, or billable API key. If a feature conflicts with the zero-cost requirement, redesign it or leave it unavailable. Obtain explicit user approval for *any* nonzero spend; do not treat approval as an automatic exception to this hard requirement.
3. Hosting, persistence, and auth must fit within documented no-cost quotas for expected two-person household use. Where practical, keep the application deployable to another free host or a user's own computer without rewriting financial logic.
4. No paid third-party financial data aggregator may be a required dependency. In particular, **automatic bank sync is optional and must not be implemented with recurring paid Plaid or similar production charges**. Prefer offline entry and user-initiated CSV/OFX/QFX bank statement imports with reconciliation and no double counting.
5. Browser-native, local-only capabilities should remain available without a paid server. Future secure shared functionality may use a free backend, but the app must never silently lose access to data if the backend is paused, suspended, or removed.
6. Provide free user-controlled data export (portable, documented CSV/JSON), import, backups and recovery. Supabase Free does not include automated backup: implement an appropriate no-cost backup/recovery strategy and clear user warnings before storing real financial records.
7. Offer clear limits/usage warnings and graceful degradation when free plan quotas are reached. No automatic upgrade path, paid add-on, or out-of-band charges.
8. Check licensing and free-plan terms, including use restrictions, before introducing new dependencies.
9. Prefer free HTTPS `.vercel.app` subdomains, free open-source components, GitHub repository, and free developer tools. Paid vanity domains and paid push/email/AI analytics must never be required.
10. For every proposed feature or platform change, include a **zero-cost impact check** (one-time cost, monthly cost, API usage, caps, renewal, license, exit path) and reject features that require mandatory spending.
11. Make it straightforward to switch providers: preserve migrations, portable schema, standard SQL/TypeScript, and independent business logic. The user must not be locked into a single free plan that could disappear.

## Current provider considerations (verify before each major release)
- **Vercel Hobby**: presently free for personal, non-commercial usage, with usage limits; terms allow free plans and rules to change.
- **Supabase Free**: presently $0 within quotas; projects may pause after about one week of inadequate activity; free projects have no included automated backups. Do not rely on continuous availability without resilience.
- **Plaid**: sandbox is free, and a limited production Trial plan may be free for eligible developers, but general pay-as-you-go product usage is chargeable. Trial access alone is not proof of an unrestricted, permanent free bank-sync solution.
- **GitHub**: use the current free repository and built-in checks; avoid paid storage, seats or action overages.

## Trade-off disclosure
No third-party service can be guaranteed to offer a free tier forever. The correct product promise is **no mandatory fees by design**, **no surprise billing**, and **portable data/code**, not an absolute promise of uninterrupted free hosting under a provider's changing terms. If infrastructure limits or new pricing make a proposed feature impossible for $0, prioritize data export and migrate to a viable free/local solution instead of requiring payment.

## Current state
The existing Vercel demo is fictional and local-only. Secure multi-user Supabase auth/database scaffolding is staged, not connected, so live bank transactions and real personal finances remain out of scope until security and backup validation pass.
