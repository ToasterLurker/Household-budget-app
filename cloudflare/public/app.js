import {
  accountDefinitions, demoEntries, balanceFor, canTransfer,
  contributionsThisWeek, formatMoney, isLedgerEntry, parseDollars, totalsFor,
} from "/shared/ledger-core.mjs";
import {
  createDemoBackup, createDemoCsv, parseDemoBackup, DEMO_MAX_BYTES,
} from "/shared/demo-portability.mjs";

const KEY = "household-budget-cloudflare-demo-v1";
const sections = ["home", "accounts", "transactions", "contributions", "savings", "settings"];
const root = document.getElementById("view");
let rows = [...demoEntries];
let notice = "";
let noticeKind = "success";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function readRows() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return [...demoEntries];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > 2000 ||
      !parsed.every(isLedgerEntry) ||
      new Set(parsed.map(item => item.id)).size !== parsed.length) return [...demoEntries];
    return parsed;
  } catch { return [...demoEntries]; }
}
rows = readRows();

function save(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    rows = next;
    return true;
  } catch {
    flash("Browser storage is unavailable. No changes were saved.", "error");
    return false;
  }
}

function flash(text, kind = "success") { notice = text; noticeKind = kind; render(); }
function localDate() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")].join("-");
}
function accountName(id) {
  return accountDefinitions.find(a => a.id === id)?.name ?? "Unknown account";
}
function balance(id) { return balanceFor(id, rows); }
function currency(cents) { return formatMoney(cents); }
function optionHtml(selectedId) {
  return accountDefinitions.map(a =>
    '<option value="' + escapeHtml(a.id) + '"' +
    (selectedId === a.id ? " selected" : "") + '>' + escapeHtml(a.name) + '</option>'
  ).join("");
}
function textRow(label, detail, right) {
  return '<div class="row"><div><strong>' + escapeHtml(label) +
    '</strong><p class="muted">' + escapeHtml(detail) + '</p></div>' +
    '<span class="tag">' + escapeHtml(right) + '</span></div>';
}
function accountCard(account) {
  const amount = balance(account.id);
  return '<article class="card"><div class="card-title"><span class="dot ' +
    escapeHtml(account.color) + '"></span><h3>' + escapeHtml(account.name) +
    '</h3><span class="tag">' + escapeHtml(account.owner) + '</span></div>' +
    '<div class="balance ' + (amount < 0 ? "negative" : "") + '">' + currency(amount) +
    '</div><p class="muted">Fictional balance · this browser only</p></article>';
}
function section(title, description, body, eyebrow = "DEMONSTRATION") {
  const alert = notice ? '<div class="notice ' + escapeHtml(noticeKind) +
    '" role="status">' + escapeHtml(notice) + '</div>' : "";
  return '<div class="heading"><div><p class="eyebrow">' + escapeHtml(eyebrow) +
    '</p><h1>' + escapeHtml(title) +
    '</h1><p class="muted">' + escapeHtml(description) +
    '</p></div><span class="demo-label">Local demo only</span></div>' +
    '<div class="notice"><strong>Fictional money only.</strong> No sign-in, bank connection or cloud-sync ' +
    'is enabled yet. Never enter real financial details in this demo.</div>' + alert + body;
}
function home() {
  const personal = balance("personal");
  const negative = accountDefinitions.filter(a => balance(a.id) < 0);
  return section("Household Dashboard", "A clear view of personal money and shared household funds.",
    '<div class="hero"><p>Personal checking · sample balance</p><strong>' + currency(personal) +
    '</strong><small>Ledger balance — not a bank balance or a future spending forecast.</small>' +
    '<a class="text-link" href="#transactions">Record a sample purchase →</a></div>' +
    (negative.length ? '<div class="notice error" style="margin-top:16px">' +
      escapeHtml(negative.map(a => a.name).join(", ") + " below zero") + '</div>' : "") +
    '<div class="section-head"><h2>Shared accounts</h2>' +
    '<p class="muted">Tracked independently. A surplus in one account never hides a shortage in another.</p></div>' +
    '<div class="cards">' + accountDefinitions.filter(a => a.owner === "Shared").map(accountCard).join("") +
    '</div><div class="section-head"><h2>Weekly household funding</h2></div><div class="card">' +
    textRow("Bill-Pay", "Sample personal contribution target: $300 weekly",
      currency(contributionsThisWeek(rows, "bills")) + " recorded") +
    textRow("Groceries", "Sample personal contribution target: $75 weekly",
      currency(contributionsThisWeek(rows, "groceries")) + " recorded") +
    '</div><p class="foot">Upcoming: secure passkey sign-in, two-person synchronization, and the separate-account forecast.</p>',
    "OVERVIEW");
}
function accountsPage() {
  return section("Your Accounts", "Each account has an independent balance.",
    '<div class="cards">' + accountDefinitions.map(accountCard).join("") + '</div>' +
    '<p class="foot">Future secure version: owners will choose between private, balance-only, ' +
    'summary, or full read-only sharing. Shared Bill-Pay and Groceries will appear for both members.</p>',
    "ACCOUNTS");
}
function transactionPage() {
  const totals = totalsFor(rows);
  const statistics = [
    ["Purchases", totals.expensesCents],
    ["Income", totals.incomeCents],
    ["Internal transfers", totals.transfersCents],
  ].map(([label, amount]) => '<div class="stat"><span>' + label + '</span><strong>' +
    currency(amount) + '</strong></div>').join("");

  const form = '<div class="forms">' +
    '<form class="card" data-form="activity"><h3>Record an activity</h3>' +
    '<p class="muted">A sample purchase or deposit updates one account.</p>' +
    '<div class="form-grid"><label>Type<select name="kind">' +
    '<option value="expense">Purchase / expense</option><option value="income">Income / deposit</option>' +
    '</select></label><label>Account<select name="account">' + optionHtml("personal") +
    '</select></label><label class="full">Description<input required maxlength="150" name="description" ' +
    'placeholder="Coffee, paycheck, groceries"></label>' +
    '<label>Amount ($)<input required inputmode="decimal" name="amount" placeholder="24.50"></label>' +
    '</div><button class="primary" type="submit">Record sample activity</button></form>' +
    '<form class="card" data-form="transfer"><h3>Move between accounts</h3>' +
    '<p class="muted">Transfers are not purchases or income.</p>' +
    '<div class="form-grid"><label>From<select name="from">' + optionHtml("personal") +
    '</select></label><label>To<select name="to">' + optionHtml("bills") +
    '</select></label><label class="full">Description<input required maxlength="150" name="description" ' +
    'value="Sample transfer"></label>' +
    '<label>Amount ($)<input required inputmode="decimal" name="amount" placeholder="75.00"></label>' +
    '</div><button class="secondary" type="submit">Record sample transfer</button></form></div>';

  const ordered = [...rows].sort((a, b) => b.date.localeCompare(a.date));
  const activities = ordered.length
    ? ordered.map(entry => {
      const place = entry.type === "transfer" ? accountName(entry.fromId) + " → " +
        accountName(entry.toId) : accountName(entry.accountId);
      const prefix = entry.type === "transfer" ? "⇄ " : entry.type === "income" ? "+" : "−";
      const good = entry.type === "income" ? "positive" : "";
      return '<div class="row activity-row"><div class="main-info"><strong>' +
        escapeHtml(entry.description) + '</strong><p class="muted">' +
        escapeHtml(place) + " · " + escapeHtml(entry.date) + " · " +
        escapeHtml(entry.type) + '</p></div><div class="actions"><span class="amount ' +
        good + '">' + prefix + currency(entry.amountCents) + '</span><button class="delete" ' +
        'type="button" data-action="delete" data-id="' + escapeHtml(entry.id) +
        '">Remove</button></div></div>';
    }).join("")
    : '<p class="muted">No activity recorded yet.</p>';
  return section("Transactions", "Record, review and undo your fictional money activity.",
    '<div class="stats">' + statistics + '</div>' + form +
    '<div class="section-head"><h2>Activity history</h2><p class="muted">Removing an entry recalculates the relevant account balances.</p></div>' +
    '<div class="card">' + activities + '</div>', "TRANSACTIONS");
}
function contributionPage() {
  const targets = [{ id: "bills", target: 30000 }, { id: "groceries", target: 7500 }];
  const cards = targets.map(t => {
    const funded = contributionsThisWeek(rows, t.id);
    const remaining = Math.max(0, t.target - funded);
    const width = Math.min(100, 100 * funded / t.target);
    return '<div class="card"><div class="card-title"><h3>' + escapeHtml(accountName(t.id)) +
      '</h3><span class="tag">50/50 example</span></div>' +
      '<p class="muted">Personal funding target each Friday</p>' +
      '<div class="balance">' + currency(t.target) +
      '</div><div class="progress"><div style="width:' + width + '%"></div></div>' +
      '<p class="muted">Recorded this week: ' + currency(funded) + '</p>' +
      '<p class="muted">Remaining: ' + currency(remaining) + '</p>' +
      '<button type="button" class="primary" data-action="fund" data-account="' + t.id + '"' +
      (remaining === 0 ? " disabled" : "") + '>' +
      (remaining ? "Record " + currency(remaining) + " contribution" : "Target recorded") +
      '</button></div>';
  }).join("");
  return section("Weekly Contributions", "Test a transfer from your personal account to a shared account.",
    '<p class="muted" style="margin-bottom:18px">These are fictional targets, not rules for your real household.' +
    ' Your partner will have a separate contribution record after secure sign-in.</p>' +
    '<div class="cards">' + cards + '</div>', "FUNDING");
}
function savingsPage() {
  return section("Optional Savings", "Money left over remains yours until you choose otherwise.",
    '<div class="card empty"><div class="symbol">◎</div><h3>Your goals, your choice</h3>' +
    '<p class="muted">Future optional virtual envelopes and real savings accounts will not create' +
    ' compulsory spending limits or savings deductions.</p></div>', "SAVINGS");
}
function settingsPage() {
  return section("Settings & Backup", "Keep your demo portable without paying for cloud storage.",
    '<div class="card"><h3>Data portability</h3>' +
    '<p class="muted">Backup and restore all transactions on this device. ' +
    'You can also move the fictional demo from our original website using a JSON backup.</p>' +
    '<div class="controls" style="margin-top:14px">' +
    '<button class="primary" data-action="backup">Download JSON backup</button>' +
    '<button class="secondary" data-action="csv">Export CSV spreadsheet</button></div>' +
    '<div class="details"><label for="backupFile">Restore JSON backup</label>' +
    '<input id="backupFile" type="file" accept=".json,application/json">' +
    '<p class="small-note">Restore replaces the current demo entries after confirmation. ' +
    'CSV files are not restorable.</p></div></div>' +
    '<div class="card" style="margin-top:15px"><h3>Reset sample data</h3>' +
    '<p class="muted">Clear any demo changes and restore original example transactions.</p>' +
    '<button class="secondary danger" type="button" data-action="reset">Reset demo</button></div>' +
    '<div class="card" style="margin-top:15px"><h3>Cloudflare migration status</h3>' +
    '<p class="muted">The backend schema and private account rules are being tested. ' +
    'Passkey login and the live shared database are not enabled for real finances yet.</p>' +
    '<p class="small-note">Operating-cost requirement: $0 recurring.</p></div>' +
    '<p class="foot">All JSON backups are unencrypted and contain only fictitious sample data. ' +
    'Do not use them to store real financial or identity information.</p>', "SETTINGS");
}
const pageFns = {
  home, accounts: accountsPage, transactions: transactionPage,
  contributions: contributionPage, savings: savingsPage, settings: settingsPage,
};

function currentSection() {
  const s = window.location.hash.replace(/^#/, "");
  return sections.includes(s) ? s : "home";
}

function render() {
  const page = currentSection();
  root.innerHTML = pageFns[page]();
  document.querySelectorAll("[data-section]").forEach(link => {
    if (link.dataset.section === page) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function newEntry(entry) {
  if (rows.length >= 2000) return flash("Demo transaction limit reached. Download a backup first.", "error");
  if (!isLedgerEntry(entry)) return flash("Invalid transaction details.", "error");
  if (save([entry, ...rows])) flash("Activity saved locally. All balances have been recalculated.");
}

root.addEventListener("submit", event => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  const data = new FormData(form);
  const amount = parseDollars(String(data.get("amount") ?? ""));
  if (amount === null) return flash("Enter a positive dollar amount with up to two decimals.", "error");
  const description = String(data.get("description") ?? "").trim().slice(0, 150);
  if (!description) return flash("Enter a description.", "error");
  const common = { id: crypto.randomUUID(), date: localDate(), amountCents: amount, description };
  if (form.dataset.form === "activity") {
    const kind = String(data.get("kind"));
    const accountId = String(data.get("account"));
    if (!["expense", "income"].includes(kind) || !accountDefinitions.some(a => a.id === accountId))
      return flash("Choose a valid account.", "error");
    newEntry({ ...common, type: kind, accountId });
  } else if (form.dataset.form === "transfer") {
    const fromId = String(data.get("from"));
    const toId = String(data.get("to"));
    if (!canTransfer(fromId, toId, amount, rows))
      return flash("Transfer accounts must differ, and the source needs sufficient funds.", "error");
    newEntry({ ...common, type: "transfer", fromId, toId });
  }
});

function download(filename, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

root.addEventListener("click", event => {
  const action = event.target.closest("[data-action]");
  if (!action) return;
  if (action.dataset.action === "delete") {
    const id = action.dataset.id;
    if (!window.confirm("Remove this sample transaction and recalculate balances?")) return;
    if (save(rows.filter(a => a.id !== id))) flash("Removed sample transaction.");
  } else if (action.dataset.action === "fund") {
    const id = action.dataset.account;
    const target = id === "bills" ? 30000 : id === "groceries" ? 7500 : 0;
    const needed = Math.max(0, target - contributionsThisWeek(rows, id));
    if (!needed || !canTransfer("personal", id, needed, rows)) {
      return flash("The target is funded or personal checking has insufficient demo funds.", "error");
    }
    newEntry({ id: crypto.randomUUID(), type: "transfer", fromId: "personal", toId: id,
      amountCents: needed, date: localDate(), description: "Weekly " + accountName(id) + " contribution" });
  } else if (action.dataset.action === "backup") {
    try { download("household-budget-demo.json", createDemoBackup(rows), "application/json"); }
    catch { return flash("Could not create backup.", "error"); }
    flash("Restorable JSON backup downloaded. Keep it in a safe place.");
  } else if (action.dataset.action === "csv") {
    try { download("household-budget-activity.csv", createDemoCsv(rows), "text/csv;charset=utf-8"); }
    catch { return flash("Could not export the spreadsheet.", "error"); }
    flash("CSV downloaded. Use JSON for complete backups.");
  } else if (action.dataset.action === "reset") {
    if (!window.confirm("Erase all your local demo edits and restore original examples?")) return;
    if (save([...demoEntries])) flash("Original sample data restored.");
  }
});

root.addEventListener("change", async event => {
  const input = event.target;
  if (input.id !== "backupFile") return;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (file.size > DEMO_MAX_BYTES) return flash("Backup exceeds the 1 MB limit.", "error");
  try {
    const contents = await file.text();
    const imported = parseDemoBackup(contents);
    if (!window.confirm("Replace current sample activity with " + imported.length +
      " entries from this backup? Download a current JSON backup first if you want to keep it.")) return;
    if (save(imported)) flash("Backup restored. Fictional balances were recalculated.");
  } catch (error) {
    flash(error instanceof Error ? error.message : "Could not restore backup.", "error");
  }
});

window.addEventListener("hashchange", () => { notice = ""; render(); });
render();
