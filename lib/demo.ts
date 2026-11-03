/** Fictional data ONLY; never render as a real synced account. */
export const accounts = [
  { id: "personal", name: "Personal Checking", owner: "Personal", balanceCents: 164025, color: "blue" },
  { id: "bills", name: "Bill-Pay", owner: "Shared", balanceCents: 155000, color: "amber" },
  { id: "groceries", name: "Groceries", owner: "Shared", balanceCents: 26000, color: "green" },
] as const;

export const transactions = [
  { id: "tx-1", title: "Grocery Store", account: "Groceries", date: "Demo • Friday", amountCents: -8642, kind: "Purchase" },
  { id: "tx-2", title: "Shared bill contribution", account: "Bill-Pay", date: "Demo • Friday", amountCents: 30000, kind: "Transfer" },
  { id: "tx-3", title: "Fuel", account: "Personal Checking", date: "Demo • Thursday", amountCents: -4217, kind: "Purchase" },
  { id: "tx-4", title: "Electric bill", account: "Bill-Pay", date: "Demo • Wednesday", amountCents: -14365, kind: "Bill" },
] as const;

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
