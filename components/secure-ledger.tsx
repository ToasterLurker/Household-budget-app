import { randomUUID } from "node:crypto";
import { formatMoney } from "@/lib/ledger-core.mjs";
import {
  changeVisibilityAction, recordEntryAction, recordTransferAction,
  setInitialBalanceAction,
} from "@/app/secure/actions";

export type AuthorizedAccount = {
  id: string;
  name: string;
  kind: "personal" | "shared_bill_pay" | "shared_groceries";
  owner_user_id: string | null;
  visibility: "private" | "balance" | "summary" | "full";
  current_balance_cents: number | string | null;
  opening_balance_cents: number | string | null;
};
export type AuthorizedJournalRow = {
  id: string;
  account_id: string;
  entry_kind: "expense" | "income" | "transfer_in" | "transfer_out";
  amount_cents: number | string;
  description: string;
  occurred_on: string;
  created_at: string;
};

function money(amount: number | string | null) {
  const cents = Number(amount);
  return Number.isSafeInteger(cents) ? formatMoney(cents) : "Balance unavailable";
}

function dateNow() {
  // The date is user-adjustable. Browser-local dates will be added in a later
  // revision; this server default must not be relied on for historical imports.
  return new Date().toISOString().slice(0, 10);
}
const visibilityNames: Record<AuthorizedAccount["visibility"], string> = {
  private: "Private — only you",
  balance: "Balance only",
  summary: "Summary (transactions hidden)",
  full: "Full read-only visibility",
};

function StatusBadge({ label }: { label: string }) {
  return <span className="tag">{label}</span>;
}

export default function SecureLedger({
  accounts, entries, userId,
}: {
  accounts: AuthorizedAccount[];
  entries: AuthorizedJournalRow[];
  userId: string;
}) {
  const editable = accounts.filter(a =>
    a.kind !== "personal" || a.owner_user_id === userId);
  const entryCounts = new Map<string, number>();
  for (const e of entries) entryCounts.set(e.account_id,(entryCounts.get(e.account_id)??0)+1);
  const canMove = editable.length > 1;
  const accountNames = new Map(accounts.map(a => [a.id,a.name]));

  return <>
    <section className="section-heading">
      <h2>Separate account balances</h2>
      <p className="muted">These amounts come from the test database, not a bank.
        Other household members can see personal accounts only when the owner allows it.</p>
    </section>
    <div className="card-grid">{accounts.map(account => {
      const personal = account.kind==="personal";
      const owner = personal && account.owner_user_id===userId;
      const editableAccount = !personal || owner;
      const canSetOpening = editableAccount && !entryCounts.has(account.id);
      return <article key={account.id} className="panel secured-account">
        <div className="panel-top">
          <h3>{account.name}</h3>
          <StatusBadge label={personal ? owner ? "Your personal" : "Shared view" : "Household"} />
        </div>
        <p className="panel-money">{money(account.current_balance_cents)}</p>
        <p className="muted">{personal ? visibilityNames[account.visibility] : "Shared with both members"}</p>
        {canSetOpening && <details className="account-details">
          <summary>Set starting test balance</summary>
          <form className="compact-form" action={setInitialBalanceAction}>
            <input type="hidden" name="account" value={account.id} />
            <label>Opening amount ($, negative allowed)
              <input name="amount" required inputMode="decimal" defaultValue="0.00" placeholder="0.00" />
            </label>
            <button type="submit" className="action-button">Save starting balance</button>
          </form>
          <p className="muted">Starting balance isn't income. It becomes locked after the first activity
            for this account.</p>
        </details>}
        {personal && owner && <details className="account-details">
          <summary>Change sharing permissions</summary>
          <form className="compact-form" action={changeVisibilityAction}>
            <input type="hidden" name="account" value={account.id} />
            <label>What your partner can see
              <select name="visibility" defaultValue={account.visibility}>
                <option value="private">Private — nothing</option>
                <option value="balance">Balance only</option>
                <option value="summary">Summary only, no transactions</option>
                <option value="full">Full transactions — read only</option>
              </select>
            </label>
            <button type="submit" className="action-button secondary-action">Update access</button>
          </form>
          <p className="muted">Full sharing reveals your personal transaction history
            to the other household member. Only you can edit personal entries.</p>
        </details>}
      </article>;
    })}</div>

    {editable.length>0 && <section className="section-heading">
      <h2>Test account activity</h2>
      <p className="muted">These controls write test-only entries to the authenticated database.
        They cannot move actual money or contact your bank.</p>
    </section>}
    <div className="form-columns">
      {editable.length>0 && <form action={recordEntryAction} className="panel entry-form">
        <h3>Record income or spending</h3>
        <p className="muted">Only accounts you may edit appear here.</p>
        <input type="hidden" name="operation" value={randomUUID()} />
        <div className="form-grid">
          <label>Type<select name="kind" defaultValue="expense">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select></label>
          <label>Account<select name="account" required>
            {editable.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}
          </select></label>
          <label className="full-field">Description
            <input name="description" maxLength={150} required placeholder="Sample transaction" />
          </label>
          <label>Amount ($)<input name="amount" required inputMode="decimal" placeholder="25.00" /></label>
          <label>Date<input name="date" type="date" required defaultValue={dateNow()} /></label>
        </div>
        <button type="submit" className="action-button">Record sample activity</button>
      </form>}
      {canMove && <form action={recordTransferAction} className="panel entry-form">
        <h3>Transfer between accounts</h3>
        <p className="muted">An atomic transfer moves money in the test ledger, not a real bank.</p>
        <input type="hidden" name="operation" value={randomUUID()} />
        <div className="form-grid">
          <label>From<select name="from" defaultValue={editable[0].id}>
            {editable.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select></label>
          <label>To<select name="to" defaultValue={editable[1].id}>
            {editable.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select></label>
          <label className="full-field">Description
            <input name="description" maxLength={150} required defaultValue="Sample transfer" />
          </label>
          <label>Amount ($)<input name="amount" required inputMode="decimal" placeholder="75.00" /></label>
          <label>Date<input name="date" type="date" required defaultValue={dateNow()} /></label>
        </div>
        <button type="submit" className="action-button secondary-action">Record sample transfer</button>
      </form>}
    </div>

    <section className="section-heading">
      <h2>Activity visible to you</h2>
      <p className="muted">Only transactions authorized by the database are returned.
        Balance-only and summary-only sharing never reveals personal transaction rows.</p>
    </section>
    <div className="panel">
      {entries.length===0 ? <p className="muted">No transactions you are authorized to see yet.</p> :
        entries.map(entry=><div className="transaction-row ledger-row" key={entry.id}>
          <div className="transaction-main">
            <strong>{entry.description}</strong>
            <p className="muted">{accountNames.get(entry.account_id)??"Account"} · {entry.occurred_on} · {
              entry.entry_kind==="transfer_in" ? "Transfer in" :
              entry.entry_kind==="transfer_out" ? "Transfer out" :
              entry.entry_kind==="expense" ? "Expense" : "Income"
            }</p>
          </div>
          <strong className={entry.entry_kind==="income" || entry.entry_kind==="transfer_in" ? "positive" : ""}>
            {entry.entry_kind==="expense" || entry.entry_kind==="transfer_out" ? "−" : "+"}
            {money(entry.amount_cents)}
          </strong>
        </div>)}
      {entries.length===50 && <p className="footnote">Showing the latest 50 accessible journal entries.</p>}
    </div>
  </>;
}
