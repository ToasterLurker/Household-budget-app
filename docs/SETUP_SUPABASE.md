# Checkpoint 3 — Connect secure sign-in (not enabled yet)

The application now contains a **staged** Supabase Auth + PostgreSQL row-level-security foundation. It is intentionally disabled until a Supabase project is provisioned and the security test plan is completed.

## Mobile-friendly setup

1. Create a Supabase project at https://supabase.com/dashboard and choose a strong, unique project database password. Do not paste that password into this chat or commit it anywhere.
2. Apply `supabase/migrations/202611030001_secure_household_foundation.sql` to a **test project** through the Supabase SQL Editor. Treat this as an unverified migration until the security acceptance matrix passes.
3. In Supabase Authentication URL Configuration, set **Site URL** to the Vercel site origin and allow the exact redirect `https://YOUR_DEPLOYMENT.vercel.app/auth/callback`. Keep email verification enabled.
4. In your **Vercel project settings**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_ORIGIN`. These two Supabase values are designed to be publishable; **never** add the service-role key, admin key, database password, or JWT secret to the app.
5. Redeploy; open `/sign-in` and create two **test** identities. Confirm email and sign in.
6. Run the full matrix in `supabase/SECURITY_TEST_PLAN.md` before trying real personal account data.

## How this checkpoint behaves

- Without configuration, `/secure` shows a clearly labeled staging screen and the existing fictional-money demo continues working.
- With configuration, sign-in, sign-up, email confirmation, per-person membership and invite acceptance can work against an applied Supabase migration.
- Each member can create a single household or use a one-time invite from an existing household; two separate shared accounts are created with zero balances.
- A personal account can be created as **private by default**, with zero balance. No real transaction editing, payments, banking, auto sync or personal visibility changing is implemented.
- Real data must remain disabled until live RLS tests have passed.

## Important integration note

The initial Vercel deployment was uploaded directly rather than connected to GitHub's automatic-deployment integration. After changing environment variables, a new deployment is necessary. The hosted demo can continue operating independently until that connection is established.

## Non-goals for this checkpoint

No bank linking, automated transfers, financial forecasts, real transaction writes, or deployment with real finances. All sign-in and database code is awaiting external setup and live security testing.
