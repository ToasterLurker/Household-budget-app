import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createHouseholdAction, createPersonalAccountAction } from "./actions";
import { signOutAction } from "@/app/sign-in/actions";
import { CreateHouseholdInvite, JoinHouseholdInvite } from "@/components/household-invitations";
import SecureLedger, {
  type AuthorizedAccount, type AuthorizedJournalRow,
} from "@/components/secure-ledger";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  "invalid-name": "Enter a name between 1 and 80 characters.",
  "household": "Could not create household. You may already be a member of one.",
  "account": "Could not create personal account. Check permissions and try again.",
  "entry-input": "Check the account, amount, date, and description and try again.",
  "entry-save": "Could not record activity. You may not have permission to edit this account.",
  "transfer-save": "Could not transfer. Check that the accounts differ, that you have access to both, and that the source has sufficient funds.",
  "opening-save": "Could not set the opening balance. Only authorized members may do this, before any transactions.",
  "visibility-save": "Could not update access. Only a personal account owner can change sharing.",
};
const notices: Record<string, string> = {
  "entry-recorded": "Sample activity recorded atomically in the test database.",
  "transfer-recorded": "Sample transfer recorded in both accounts without counting as spending.",
  "opening-recorded": "Starting test balance saved without counting as income.",
  "visibility-updated": "Your personal account sharing choice is now enforced by the database.",
};

export default async function SecureHouseholdPage({ searchParams }: {
  searchParams: Promise<{ error?: string; notice?: string }>
}) {
  const client = await createSupabaseServerClient();
  if (!client) return <div className="secure-wrap">
    <p className="eyebrow">SECURE WORKSPACE · PREPARATION</p>
    <h1>Private household budgeting</h1>
    <div className="demo-warning">
      <strong>The browser-only demo remains available.</strong> The secure Supabase database
      is not connected to this deployment yet, so real sign-in is unavailable.
    </div>
    <Link href="/" className="text-link">Return to interactive demo →</Link>
  </div>;

  const { data: claims, error: authError } = await client.auth.getClaims();
  const currentUserId = claims?.claims?.sub;
  if (authError || typeof currentUserId !== "string") redirect("/sign-in");

  const { data: households, error: householdError } = await client
    .from("households").select("id, name, created_at").limit(1);
  const q = await searchParams;

  if (householdError) return <div className="secure-wrap">
    <p className="eyebrow">SECURE WORKSPACE · DATABASE UNAVAILABLE</p>
    <h1>Cannot safely load your household</h1>
    <div className="demo-warning" role="alert">
      The authenticated database query failed. We will not show financial records
      until access can be verified.
    </div>
    <form action={signOutAction}><button className="action-button secondary-action">Sign out</button></form>
  </div>;

  const household = households?.[0] ?? null;

  const accountResponse = household
    ? await client.from("accounts")
      .select("id,name,kind,visibility,owner_user_id,current_balance_cents")
      .eq("household_id", household.id).order("created_at")
    : { data: [], error: null };
  const accounts = (accountResponse.data ?? []).map(item => ({
    id: String(item.id),
    name: String(item.name),
    kind: item.kind as AuthorizedAccount["kind"],
    owner_user_id: item.owner_user_id as string | null,
    visibility: item.visibility as AuthorizedAccount["visibility"],
    current_balance_cents: item.current_balance_cents as number | string | null,
  }));

  const accountIds = accounts.map(item => item.id);
  const ledgerResponse = accountIds.length > 0
    ? await client.from("ledger_entries")
      .select("id,account_id,entry_kind,amount_cents,description,occurred_on,created_at")
      .in("account_id", accountIds)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50)
    : { data: [], error: null };
  const entries: AuthorizedJournalRow[] = (ledgerResponse.data ?? []).map(item => ({
    id: String(item.id),
    account_id: String(item.account_id),
    entry_kind: item.entry_kind as AuthorizedJournalRow["entry_kind"],
    amount_cents: item.amount_cents as number | string,
    description: String(item.description),
    occurred_on: String(item.occurred_on),
    created_at: String(item.created_at),
  }));

  return <div className="secure-wrap">
    <div className="page-heading">
      <div>
        <p className="eyebrow">SECURE HOUSEHOLD · TEST DATABASE</p>
        <h1>{household ? household.name : "Set up your household"}</h1>
        <p className="muted">Authenticated account · Personal and shared visibility enforced in PostgreSQL</p>
      </div>
      <form action={signOutAction}><button className="action-button secondary-action">Sign out</button></form>
    </div>

    <div className="demo-warning">
      <strong>Testing only.</strong> The secure database is available, but live browser authentication,
      concurrent requests, free backups and recovery still need acceptance testing.
      Do not enter real financial, banking, or identity details yet.
      The existing fictional <Link className="text-link" href="/">offline demo</Link> remains separate.
    </div>
    {q.error && messages[q.error] && <p className="auth-error" role="alert">{messages[q.error]}</p>}
    {q.notice && notices[q.notice] && <p className="auth-notice" role="status">{notices[q.notice]}</p>}

    {!household ? <>
      <div className="panel">
        <h3>Create a two-person household</h3>
        <p className="muted">Creates separate zero-balance Bill-Pay and Groceries accounts.
          Invite your partner after creating your household.</p>
        <form action={createHouseholdAction} className="auth-form">
          <label>Household name<input name="name" placeholder="Our test household"
            required maxLength={80} /></label>
          <button className="action-button" type="submit">Create test household</button>
        </form>
      </div>
      <JoinHouseholdInvite />
    </> : <>
      {(accountResponse.error || ledgerResponse.error)
        ? <div className="auth-error" role="alert">
          Cannot display financial data until the authenticated database query succeeds.
        </div>
        : <SecureLedger accounts={accounts} entries={entries} userId={currentUserId} />}
      <div className="panel spaced-panel">
        <h3>Add your private personal account</h3>
        <p className="muted">New accounts default to private and start at zero.
          Only you can add or edit your personal transactions.</p>
        <form action={createPersonalAccountAction} className="auth-form">
          <label>Account name<input name="name" placeholder="Sample personal checking"
            required maxLength={80} /></label>
          <button className="action-button" type="submit">Create private test account</button>
        </form>
      </div>
      <CreateHouseholdInvite householdId={household.id} />
    </>}
    <p className="footnote">All accounts in this workspace are for testing.
      View the <Link className="text-link" href="/">free interactive browser demo</Link> without signing in.</p>
  </div>;
}
