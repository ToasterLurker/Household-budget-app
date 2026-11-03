import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createHouseholdAction, createPersonalAccountAction } from "./actions";
import { signOutAction } from "@/app/sign-in/actions";
import { CreateHouseholdInvite, JoinHouseholdInvite } from "@/components/household-invitations";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  "invalid-name": "Enter a name between 1 and 80 characters.",
  "household": "Could not create household. You might already belong to one.",
  "account": "Could not create personal account. Check permissions and try again.",
};

export default async function SecureHouseholdPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>
}) {
  const client = await createSupabaseServerClient();
  if (!client) return <div className="secure-wrap">
    <p className="eyebrow">SECURE WORKSPACE · PREPARATION</p>
    <h1>Multi-user accounts are the next checkpoint</h1>
    <div className="demo-warning">
      <strong>The demo remains available.</strong> The sign-in and database security code has been prepared,
      but no Supabase project has been connected to this deployment. Real sign-in and shared accounts are disabled.
    </div>
    <p className="muted">We need a Supabase project, the reviewed RLS migration, and verified isolation tests before entering financial data.</p>
    <Link href="/" className="text-link">Return to interactive demo →</Link>
  </div>;

  const { data: claimData, error: claimError } = await client.auth.getClaims();
  if (claimError || !claimData?.claims?.sub) redirect("/sign-in");

  const { data: households, error: householdsError } = await client
    .from("households").select("id, name, created_at").limit(1);

  const q = await searchParams;
  if (householdsError) return <div className="secure-wrap">
    <p className="eyebrow">SECURE WORKSPACE · DATABASE NOT READY</p>
    <h1>Database setup is incomplete</h1>
    <div className="demo-warning" role="alert">
      Your identity was verified, but the secure household tables are not available yet.
      Apply and verify the Supabase migration before enabling the household workspace.
    </div>
    <form action={signOutAction}><button className="action-button secondary-action">Sign out</button></form>
  </div>;

  const household = households?.[0] ?? null;
  const { data: accounts, error: accountError } = household
    ? await client.from("accounts")
      .select("id, name, kind, visibility, owner_user_id, current_balance_cents")
      .eq("household_id", household.id).order("created_at")
    : { data: [], error: null };

  return <div className="secure-wrap">
    <div className="page-heading">
      <div><p className="eyebrow">SECURE HOUSEHOLD · EXPERIMENTAL</p>
        <h1>{household ? household.name : "Set up a household"}</h1>
        <p className="muted">Signed in · Household data is governed by database access policies.</p>
      </div>
      <form action={signOutAction}><button className="action-button secondary-action">Sign out</button></form>
    </div>
    <div className="demo-warning">
      <strong>Security staging:</strong> Account and household access are being built and tested.
      Financial entries and bank syncing remain disabled. Do not enter real financial information.
    </div>
    {q.error && messages[q.error] && <p className="auth-error" role="alert">{messages[q.error]}</p>}
    {!household ? <>
      <div className="panel">
        <h3>Create your household</h3>
        <p className="muted">Creates separate shared Bill-Pay and Groceries accounts with zero demo balances.</p>
        <form action={createHouseholdAction} className="auth-form">
          <label>Household name<input name="name" placeholder="Our household" required maxLength={80} /></label>
          <button className="action-button" type="submit">Create household</button>
        </form>
      </div>
      <JoinHouseholdInvite />
    </> : <>
      <section className="section-heading"><h2>Authorized account overview</h2>
        <p className="muted">Each account's visibility is enforced by the database, not by hiding rows in the browser.</p>
      </section>
      {accountError ? <div className="demo-warning" role="alert">Unable to load accounts.</div> :
        <div className="card-grid">{(accounts ?? []).map(account =>
          <article className="panel" key={account.id}>
            <div className="panel-top"><h3>{account.name}</h3>
              <span className="tag">{account.kind === "personal" ? "Personal" : "Shared"}</span></div>
            <p className="panel-money">Not yet funded</p>
            <p className="muted">Zero-balance account · transactions not yet enabled</p>
            {account.kind === "personal" && <p className="muted">Visibility: {account.visibility}</p>}
          </article>)}</div>}
      <div className="panel spaced-panel">
        <h3>Add your own personal account</h3>
        <p className="muted">New personal accounts default to private. This stage creates only zero-balance records.</p>
        <form action={createPersonalAccountAction} className="auth-form">
          <label>Account name<input name="name" placeholder="Personal checking" required maxLength={80} /></label>
          <button className="action-button" type="submit">Add private account</button>
        </form>
      </div>
      <CreateHouseholdInvite householdId={household.id} />
    </>}
    <p className="footnote">Return to the <Link className="text-link" href="/">interactive demo</Link> for example transactions.</p>
  </div>;
}
