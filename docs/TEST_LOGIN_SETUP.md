# Test Login Setup — one-time Supabase Auth redirect

**Status:** The Supabase Free test database is created, deployed and connected through the Vercel project's public publishable key. This is NOT a financial production system.

## One-time URL configuration required in the Supabase dashboard

Sign up / email confirmation needs the real app origin rather than Supabase's default localhost URL.

1. Open the Supabase dashboard for project `household-budget-app-test` (`xomtjnzqfxsddkmlnnqz`) in the HomeBudgeting organization.
2. Go to **Authentication → URL Configuration**.
3. Set **Site URL** exactly to `https://household-budget-app-gold-iota.vercel.app`.
4. Add the exact **Redirect URL** `https://household-budget-app-gold-iota.vercel.app/auth/callback`.
5. Save. Keep email confirmation enabled and do not share any passwords, service-role keys or database credentials with the assistant.
6. Navigate to `https://household-budget-app-gold-iota.vercel.app/sign-in` and create one temporary test login; confirm the email and sign in.
7. Create a test household. Then, using a different test login on another browser/incognito session, join with the one-time invitation code. Do not use actual bank records.
8. Test that a second member can view both shared accounts; cannot see the first member's private personal accounts; can see a balance-only account balance but not entries; and can see full read-only transaction history only after the owner changes visibility to Full.

Reference: https://supabase.com/docs/guides/auth/redirect-urls

## Auth acceptance gate

Do not enable real financial recording until the two-user session, RLS, transaction permission, invite, and backup/recovery checks pass. A build that compiles is not evidence that email confirmation was tested.

## Current infrastructure

- Vercel Hobby (no custom paid domain)
- Supabase Free (single project, no paid database features)
- GitHub repository in user's account
- All project settings and data-model changes must satisfy the [zero-cost policy](ZERO_COST_POLICY.md)

Do not upgrade tiers or enable billable usage.
