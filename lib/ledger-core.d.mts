export type AccountId = "personal" | "bills" | "groceries";
export type EntryType = "expense" | "income" | "transfer";
export type LedgerEntry = {
  id: string;
  type: EntryType;
  amountCents: number;
  description: string;
  date: string;
  accountId?: AccountId;
  fromId?: AccountId;
  toId?: AccountId;
};
export type AccountDefinition = {
  id: AccountId;
  name: string;
  owner: "Personal" | "Shared";
  color: string;
  openingCents: number;
};
export const accountDefinitions: readonly AccountDefinition[];
export const demoEntries: readonly LedgerEntry[];
export function parseDollars(value: string): number | null;
export function formatMoney(cents: number, signed?: boolean): string;
export function isLedgerEntry(value: unknown): value is LedgerEntry;
export function balanceFor(accountId: AccountId, entries: readonly LedgerEntry[]): number;
export function totalsFor(entries: readonly LedgerEntry[]): {
  expensesCents: number; incomeCents: number; transfersCents: number;
};
export function canTransfer(
  fromId: AccountId, toId: AccountId,
  amountCents: number, entries: readonly LedgerEntry[],
): boolean;
export function mondayOfWeek(date: Date): string;
export function contributionsThisWeek(entries: readonly LedgerEntry[], toId: AccountId, now?: Date): number;
