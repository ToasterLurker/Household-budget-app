"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import {
  accountDefinitions, balanceFor, canTransfer, contributionsThisWeek,
  demoEntries, formatMoney, isLedgerEntry, parseDollars, totalsFor,
} from "@/lib/ledger-core.mjs";
import type { AccountId, LedgerEntry } from "@/lib/ledger-core.mjs";
import Link from "next/link";

type PageSection = "home" | "accounts" | "transactions" | "contributions" | "savings" | "settings";
type LedgerSnapshot = { entries: LedgerEntry[]; hydrated: boolean };
const STORAGE_KEY = "household-budget-demonstration-v2";
const SERVER_SNAPSHOT: LedgerSnapshot = { entries: [...demoEntries], hydrated: false };
let currentSnapshot: LedgerSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function getSnapshot() { return currentSnapshot; }
function getServerSnapshot() { return SERVER_SNAPSHOT; }
function publish(snapshot: LedgerSnapshot) {
  currentSnapshot = snapshot;
  listeners.forEach(listener => listener());
}
function initialize() {
  if (typeof window === "undefined" || currentSnapshot.hydrated) return;
  let entries: LedgerEntry[] = [...demoEntries];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const saved: unknown = JSON.parse(raw);
      if (saved !== null && typeof saved === "object" && "entries" in saved) {
        const candidate = saved.entries;
        if (Array.isArray(candidate) && candidate.length <= 2000 &&
            candidate.every(isLedgerEntry) &&
            new Set(candidate.map((entry: LedgerEntry) => entry.id)).size === candidate.length) {
          entries = candidate;
        }
      }
    }
  } catch {
    // Unreadable browser storage must not prevent use of the sample interface.
  }
  publish({ entries, hydrated: true });
}
function persist(entries: LedgerEntry[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, entries }));
    publish({ entries, hydrated: true });
    return true;
  } catch { return false; }
}
function resetLedger(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    publish({ entries: [...demoEntries], hydrated: true });
    return true;
  } catch { return false; }
}
function useDemoLedger() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { initialize(); }, []);
  return state;
}
function uniqueId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID() : "demo-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}
function localDate(): string {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")].join("-");
}
function accountName(id?: AccountId): string {
  return accountDefinitions.find(a => a.id === id)?.name ?? "Unknown account";
}
function addEntry(entry: LedgerEntry): boolean {
  if (!isLedgerEntry(entry)) return false;
  return persist([entry, ...currentSnapshot.entries]);
}

function Heading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="page-heading">
    <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div>
    <span className="demo-pill">Demo only</span>
  </div>;
}
function DemoWarning() {
  return <div className="demo-warning" role="note">
    <strong>Local demonstration:</strong> Fictional balances and transactions. Changes are saved only in this browser.
    There is no login, bank connection, or multi-device sync. Please do not enter real financial information.
  </div>;
}
function AccountCard({ accountId, entries }: { accountId: AccountId; entries: LedgerEntry[] }) {
  const account = accountDefinitions.find(a => a.id === accountId);
  if (!account) return null;
  const balance = balanceFor(accountId, entries);
  return <article className="panel">
    <div className="panel-top"><span className={"account-dot " + account.color} /><h3>{account.name}</h3>
      <span className="tag">{account.owner}</span></div>
    <p className={"panel-money " + (balance < 0 ? "negative" : "")}>{formatMoney(balance)}</p>
    <p className="muted">App-calculated sample balance</p>
    {balance < 0 && <p className="negative small-alert">Below zero in this example account</p>}
  </article>;
}
function Home({ entries }: { entries: LedgerEntry[] }) {
  const personalBalance = balanceFor("personal", entries);
  const negatives = accountDefinitions.filter(a => balanceFor(a.id, entries) < 0);
  return <>
    <Heading eyebrow="OVERVIEW" title="Household Dashboard" description="See your money and shared balances at a glance." />
    <div className="hero-card">
      <p className="hero-label">Personal checking · demo balance</p>
      <strong className="hero-money">{formatMoney(personalBalance)}</strong>
      <p>Balance reflects the example ledger, not a bank balance or forecast of money safe to spend.</p>
      <Link href="/transactions" className="text-link">Record an activity →</Link>
    </div>
    {negatives.length > 0 && <div className="shortage-warning" role="status">
      {negatives.map(a => a.name).join(", ")} {negatives.length > 1 ? "have" : "has"} a negative demo balance.
    </div>}
    <section className="section-heading"><h2>Shared household accounts</h2>
      <p className="muted">Tracked separately so one account cannot hide another account's shortage.</p></section>
    <div className="card-grid">
      <AccountCard accountId="bills" entries={entries} />
      <AccountCard accountId="groceries" entries={entries} />
    </div>
    <section className="section-heading"><h2>This week's contributions</h2></section>
    <div className="panel">
      <div className="event-row"><div><strong>Bill-Pay</strong><p className="muted">Example personal target: $300.00 weekly</p></div>
        <span className="tag">{formatMoney(contributionsThisWeek(entries, "bills"))} recorded</span></div>
      <div className="event-row"><div><strong>Groceries</strong><p className="muted">Example personal target: $75.00 weekly</p></div>
        <span className="tag">{formatMoney(contributionsThisWeek(entries, "groceries"))} recorded</span></div>
      <Link href="/contributions" className="text-link">Manage demo contributions →</Link>
    </div>
  </>;
}
function Accounts({ entries }: { entries: LedgerEntry[] }) {
  return <>
    <Heading eyebrow="ACCOUNTS" title="Your accounts" description="Personal checking and household funds, with independent balances." />
    <div className="card-grid">{accountDefinitions.map(a =>
      <AccountCard key={a.id} accountId={a.id} entries={entries} />)}</div>
    <p className="footnote">Each demo account starts with a fictional opening balance. All recorded expenses, income, and transfers recalculate that account's balance. No bank data is read or changed.</p>
  </>;
}
function ActivityForm({ entries, hydrated }: { entries: LedgerEntry[]; hydrated: boolean }) {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [accountId, setAccountId] = useState<AccountId>("personal");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [feedback, setFeedback] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = parseDollars(amount);
    if (cents === null || !description.trim()) {
      setFeedback("Enter a description and a positive dollar amount (maximum two decimal places).");
      return;
    }
    if (entries.length >= 2000) { setFeedback("This demonstration has reached its transaction limit."); return; }
    const entry: LedgerEntry = { id: uniqueId(), type: kind, accountId,
      amountCents: cents, description: description.trim().slice(0, 150), date: localDate() };
    if (!addEntry(entry)) { setFeedback("Could not save in this browser. Check that local storage is enabled."); return; }
    setAmount(""); setDescription(""); setFeedback("Recorded in your local demonstration.");
  }
  return <form className="panel entry-form" onSubmit={submit}>
    <h3>Record a purchase or income</h3>
    <p className="muted">Updates the selected example account immediately.</p>
    <div className="form-grid">
      <label>Type<select value={kind} onChange={e => setKind(e.target.value as "expense" | "income")}>
        <option value="expense">Purchase / expense</option><option value="income">Income / deposit</option>
      </select></label>
      <label>Account<select value={accountId} onChange={e => setAccountId(e.target.value as AccountId)}>
        {accountDefinitions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select></label>
      <label className="full-field">Description<input required maxLength={150} value={description}
        onChange={e => setDescription(e.target.value)} placeholder="e.g. Coffee or paycheck" /></label>
      <label>Amount (USD)<input required inputMode="decimal" value={amount}
        onChange={e => setAmount(e.target.value)} placeholder="24.50" /></label>
    </div>
    <button className="action-button" type="submit" disabled={!hydrated}>Record activity</button>
    <p className="form-feedback" role="status">{feedback}</p>
  </form>;
}
function TransferForm({ entries, hydrated }: { entries: LedgerEntry[]; hydrated: boolean }) {
  const [fromId, setFromId] = useState<AccountId>("personal");
  const [toId, setToId] = useState<AccountId>("bills");
  const [amount, setAmount] = useState("");
  const [feedback, setFeedback] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = parseDollars(amount);
    if (cents === null || !canTransfer(fromId, toId, cents, entries)) {
      setFeedback("Choose different accounts and an amount no greater than the source balance.");
      return;
    }
    if (entries.length >= 2000) { setFeedback("This demonstration has reached its transaction limit."); return; }
    const entry: LedgerEntry = { id: uniqueId(), type: "transfer", fromId, toId,
      amountCents: cents, description: "Manual account transfer", date: localDate() };
    if (!addEntry(entry)) { setFeedback("Could not save in this browser."); return; }
    setAmount(""); setFeedback("Transfer recorded. It did not count as spending.");
  }
  return <form className="panel entry-form" onSubmit={submit}>
    <h3>Move money between accounts</h3>
    <p className="muted">A transfer lowers one balance and raises the other. It is not an expense.</p>
    <div className="form-grid">
      <label>From<select value={fromId} onChange={e => setFromId(e.target.value as AccountId)}>
        {accountDefinitions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select></label>
      <label>To<select value={toId} onChange={e => setToId(e.target.value as AccountId)}>
        {accountDefinitions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select></label>
      <label>Amount (USD)<input required inputMode="decimal" value={amount}
        onChange={e => setAmount(e.target.value)} placeholder="75.00" /></label>
    </div>
    <button className="action-button secondary-action" type="submit" disabled={!hydrated}>Record transfer</button>
    <p className="form-feedback" role="status">{feedback}</p>
  </form>;
}
function EntryList({ entries, hydrated }: { entries: LedgerEntry[]; hydrated: boolean }) {
  const ordered = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const [feedback, setFeedback] = useState("");
  function remove(id: string) {
    if (!window.confirm("Remove this demo entry? Its effect on account balances will be reversed.")) return;
    if (!persist(currentSnapshot.entries.filter(entry => entry.id !== id))) {
      setFeedback("Could not update local storage.");
    } else {
      setFeedback("Entry removed. All affected balances have been recalculated.");
    }
  }
  return <section className="panel ledger-panel">
    <div className="list-heading"><h3>Recorded activity</h3><span className="tag">{entries.length} entries</span></div>
    <p className="form-feedback" role="status">{feedback}</p>
    {ordered.length === 0 ? <p className="muted">No example entries yet. Use the forms above to add one.</p> :
      ordered.map(entry => <div className="transaction-row ledger-row" key={entry.id}>
        <div className="transaction-main"><strong>{entry.description}</strong>
          <p className="muted">{entry.type === "transfer"
            ? accountName(entry.fromId) + " → " + accountName(entry.toId)
            : accountName(entry.accountId)}
            {" · "}{entry.date}{" · "}{entry.type}</p></div>
        <div className="entry-actions"><strong className={entry.type === "income" ? "positive" : ""}>
          {entry.type === "income" ? "+" : entry.type === "expense" ? "−" : "⇄ "}{formatMoney(entry.amountCents)}
        </strong>
          <button type="button" className="remove-entry" disabled={!hydrated}
            aria-label={"Remove " + entry.description} onClick={() => remove(entry.id)}>Remove</button>
        </div>
      </div>)}
  </section>;
}
function Transactions({ entries, hydrated }: { entries: LedgerEntry[]; hydrated: boolean }) {
  const totals = totalsFor(entries);
  return <>
    <Heading eyebrow="TRANSACTIONS" title="Record activity" description="Test purchases, deposits, and account-to-account transfers." />
    <div className="stats-grid">
      <div className="stat-card"><span className="muted">Recorded purchases</span><strong>{formatMoney(totals.expensesCents)}</strong></div>
      <div className="stat-card"><span className="muted">Recorded income</span><strong>{formatMoney(totals.incomeCents)}</strong></div>
      <div className="stat-card"><span className="muted">Internal transfers</span><strong>{formatMoney(totals.transfersCents)}</strong></div>
    </div>
    <div className="form-columns"><ActivityForm entries={entries} hydrated={hydrated} />
      <TransferForm entries={entries} hydrated={hydrated} /></div>
    <section className="section-heading"><h2>Activity history</h2>
      <p className="muted">Delete an entry to reverse its effect on the demo balances.</p></section>
    <EntryList entries={entries} hydrated={hydrated} />
  </>;
}
function Contributions({ entries, hydrated }: { entries: LedgerEntry[]; hydrated: boolean }) {
  const [feedback, setFeedback] = useState("");
  const targets: { toId: AccountId; targetCents: number; note: string }[] = [
    { toId: "bills", targetCents: 30000, note: "Shared household bills" },
    { toId: "groceries", targetCents: 7500, note: "Shared grocery card" },
  ];
  function fund(toId: AccountId, targetCents: number) {
    const funded = contributionsThisWeek(currentSnapshot.entries, toId);
    const remaining = Math.max(0, targetCents - funded);
    if (remaining === 0) { setFeedback("This example contribution is already fully recorded for the week."); return; }
    if (!canTransfer("personal", toId, remaining, currentSnapshot.entries)) {
      setFeedback("Personal checking has insufficient demo funds to record this contribution."); return;
    }
    const entry: LedgerEntry = {
      id: uniqueId(), type: "transfer", fromId: "personal", toId,
      amountCents: remaining, description: "Weekly " + accountName(toId) + " contribution", date: localDate(),
    };
    if (!addEntry(entry)) { setFeedback("Could not save this demo contribution."); return; }
    setFeedback("Recorded personal contribution to " + accountName(toId) + ". Transfers are not expenses.");
  }
  return <>
    <Heading eyebrow="CONTRIBUTIONS" title="Weekly household funding" description="Two separate shared accounts, with fictional 50/50 targets." />
    <p className="muted block-note">This prototype records only the currently displayed person's side of each shared contribution. Partner payments, reminders, and approval controls come after secure sign-in.</p>
    <div className="card-grid">{targets.map(target => {
      const funded = contributionsThisWeek(entries, target.toId);
      const remaining = Math.max(0, target.targetCents - funded);
      return <article className="panel contribution-card" key={target.toId}>
        <div className="panel-top"><h3>{accountName(target.toId)}</h3><span className="tag">50/50 example</span></div>
        <p className="muted">{target.note}</p>
        <p className="contribution-label">Weekly target per person</p>
        <p className="panel-money">{formatMoney(target.targetCents)}</p>
        <div className="progress-track" aria-hidden="true"><div style={{ width: Math.min(100, funded / target.targetCents * 100) + "%" }} /></div>
        <p className="muted">This week recorded: {formatMoney(funded)}</p>
        <p className="muted">Remaining: {formatMoney(remaining)}</p>
        <button className="action-button" type="button"
          disabled={!hydrated || remaining === 0}
          onClick={() => fund(target.toId, target.targetCents)}>
          {remaining === 0 ? "Target recorded" : "Record " + formatMoney(remaining) + " contribution"}
        </button>
      </article>;
    })}</div>
    <p className="form-feedback" role="status">{feedback}</p>
    <p className="footnote">Demo contribution buttons record transfers from personal checking. They do not move real funds, and targets here are editable only in a later version.</p>
  </>;
}
function Savings() {
  return <>
    <Heading eyebrow="SAVINGS" title="Optional savings" description="Save what you choose, without restricting personal spending." />
    <div className="panel empty-panel"><span aria-hidden="true">◎</span><h3>Your goals, on your terms</h3>
      <p className="muted">Virtual allocations, physical savings accounts, and weekly savings schedules will be added after account access is secured. No mandatory personal savings or catch-up payments.</p></div>
  </>;
}
function Settings({ entries }: { entries: LedgerEntry[] }) {
  const [feedback, setFeedback] = useState("");
  function reset() {
    if (!window.confirm("Reset the local demonstration? This will erase your changes and restore all sample transactions.")) return;
    setFeedback(resetLedger() ? "Demo reset to its original example balances and activity." : "Could not reset browser storage.");
  }
  return <>
    <Heading eyebrow="SETTINGS" title="Demo preferences" description="Local sample data and upcoming household permissions." />
    <div className="panel">
      <h3>Local demonstration storage</h3>
      <p className="muted">Your demo entries live only in this browser on this device. They are not available to your partner or other devices, and are not protected by user accounts.</p>
      <p className="muted">{entries.length} sample entries currently recorded.</p>
      <button type="button" className="action-button danger-action" onClick={reset}>Reset all demo entries</button>
      <p className="form-feedback" role="status">{feedback}</p>
    </div>
    <div className="panel spaced-panel"><h3>Privacy roadmap</h3>
      <p className="muted">Each future household member will have their own sign-in. Personal accounts will default to private, and owners will choose how much information to share. Shared accounts will be visible to both members.</p>
    </div>
  </>;
}
export default function DemoWorkspace({ section }: { section: PageSection }) {
  const { entries, hydrated } = useDemoLedger();
  return <>
    <DemoWarning />
    {section === "home" && <Home entries={entries} />}
    {section === "accounts" && <Accounts entries={entries} />}
    {section === "transactions" && <Transactions entries={entries} hydrated={hydrated} />}
    {section === "contributions" && <Contributions entries={entries} hydrated={hydrated} />}
    {section === "savings" && <Savings />}
    {section === "settings" && <Settings entries={entries} />}
  </>;
}
