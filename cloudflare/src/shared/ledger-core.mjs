/**
 * Pure, demo-only ledger engine.
 * All amounts are integer cents. Transfers alter two balances but are never expenses.
 * This is not a banking ledger or an authorization layer.
 */
export const accountDefinitions = Object.freeze([
  { id: "personal", name: "Personal Checking", owner: "Personal", color: "blue", openingCents: 160000 },
  { id: "bills", name: "Bill-Pay", owner: "Shared", color: "amber", openingCents: 140000 },
  { id: "groceries", name: "Groceries", owner: "Shared", color: "green", openingCents: 30000 },
]);

export const demoEntries = Object.freeze([
  { id: "demo-income", type: "income", accountId: "personal", amountCents: 85000, description: "Sample paycheck", date: "2026-10-30" },
  { id: "demo-bill-transfer", type: "transfer", fromId: "personal", toId: "bills", amountCents: 30000, description: "Sample bill-pay contribution", date: "2026-10-30" },
  { id: "demo-grocery-transfer", type: "transfer", fromId: "personal", toId: "groceries", amountCents: 7500, description: "Sample grocery contribution", date: "2026-10-30" },
  { id: "demo-grocery", type: "expense", accountId: "groceries", amountCents: 8642, description: "Sample grocery purchase", date: "2026-11-01" },
  { id: "demo-fuel", type: "expense", accountId: "personal", amountCents: 4217, description: "Sample fuel purchase", date: "2026-11-02" },
  { id: "demo-electric", type: "expense", accountId: "bills", amountCents: 14365, description: "Sample electric bill", date: "2026-11-02" },
]);

const accountIds = new Set(accountDefinitions.map(a => a.id));
const isAccountId = id => accountIds.has(id);
const isValidAmount = value => Number.isSafeInteger(value) && value > 0 && value <= 999999999;

/** Parse USD dollars without floating-point conversion. Returns integer cents or null. */
export function parseDollars(input) {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value)) return null;
  const [dollars, fraction = ""] = value.split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
  return isValidAmount(cents) ? cents : null;
}

export function formatMoney(cents, signed = false) {
  const absolute = (Math.abs(cents) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (cents < 0) return "-$" + absolute;
  if (cents > 0 && signed) return "+$" + absolute;
  return "$" + absolute;
}

export function isLedgerEntry(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (typeof entry.id !== "string" || entry.id.length < 1 || entry.id.length > 100) return false;
  if (typeof entry.description !== "string" || entry.description.trim().length < 1 || entry.description.length > 150) return false;
  if (typeof entry.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return false;
  if (!isValidAmount(entry.amountCents)) return false;
  if (entry.type === "transfer") {
    return isAccountId(entry.fromId) && isAccountId(entry.toId) && entry.fromId !== entry.toId;
  }
  return (entry.type === "income" || entry.type === "expense") && isAccountId(entry.accountId);
}

export function balanceFor(accountId, entries) {
  const account = accountDefinitions.find(a => a.id === accountId);
  if (!account) throw new Error("Unknown account.");
  let cents = account.openingCents;
  for (const entry of entries) {
    if (entry.type === "transfer") {
      if (entry.fromId === accountId) cents -= entry.amountCents;
      if (entry.toId === accountId) cents += entry.amountCents;
    } else if (entry.accountId === accountId) {
      cents += entry.type === "income" ? entry.amountCents : -entry.amountCents;
    }
  }
  return cents;
}

export function totalsFor(entries) {
  return entries.reduce((totals, entry) => {
    if (entry.type === "expense") totals.expensesCents += entry.amountCents;
    if (entry.type === "income") totals.incomeCents += entry.amountCents;
    if (entry.type === "transfer") totals.transfersCents += entry.amountCents;
    return totals;
  }, { expensesCents: 0, incomeCents: 0, transfersCents: 0 });
}

export function canTransfer(fromId, toId, amountCents, entries) {
  return isAccountId(fromId) && isAccountId(toId) && fromId !== toId &&
    isValidAmount(amountCents) && balanceFor(fromId, entries) >= amountCents;
}

export function mondayOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

export function contributionsThisWeek(entries, toId, now = new Date()) {
  const start = mondayOfWeek(now);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  end.setDate(end.getDate() + (7 - ((end.getDay() + 6) % 7)));
  const endIso = [end.getFullYear(), String(end.getMonth() + 1).padStart(2, "0"), String(end.getDate()).padStart(2, "0")].join("-");
  return entries.reduce((sum, entry) =>
    entry.type === "transfer" && entry.fromId === "personal" && entry.toId === toId && entry.date >= start && entry.date < endIso
      ? sum + entry.amountCents : sum, 0);
}
