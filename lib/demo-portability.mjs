/**
 * Portable backups for the *fictional browser-only demo*, not real financial records.
 *
 * This format describes the fixed demo ledger in version 1. It does not contain
 * banking credentials, user credentials, or account secrets.
 */
import { accountDefinitions, isLedgerEntry } from "./ledger-core.mjs";

export const DEMO_BACKUP_FORMAT = "household-budget-demo";
export const DEMO_BACKUP_VERSION = 1;
export const DEMO_MAX_ENTRIES = 2000;
export const DEMO_MAX_BYTES = 1024 * 1024;
const expectedAccountIds = accountDefinitions.map((a) => a.id);

function isValidIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 2000 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

/** Only retain whitelisted fields; never propagate unknown imported object keys. */
function normalizeEntry(entry) {
  const core = {
    id: entry.id, type: entry.type,
    description: entry.description, date: entry.date,
    amountCents: entry.amountCents,
  };
  if (entry.type === "transfer") {
    return { ...core, fromId: entry.fromId, toId: entry.toId };
  }
  return { ...core, accountId: entry.accountId };
}

export function validateDemoEntries(entries) {
  if (!Array.isArray(entries) || entries.length > DEMO_MAX_ENTRIES) {
    throw new Error("Backup has too many entries or is missing its entry list.");
  }
  const ids = new Set();
  const normalized = [];
  for (const item of entries) {
    if (!isLedgerEntry(item) || !isValidIsoDate(item.date)) {
      throw new Error("Backup contains an invalid amount, account, date, or entry.");
    }
    if (ids.has(item.id)) throw new Error("Backup contains duplicate transaction IDs.");
    ids.add(item.id);
    normalized.push(normalizeEntry(item));
  }
  return normalized;
}

function makeRecord(entries, exportedAt) {
  return {
    format: DEMO_BACKUP_FORMAT,
    version: DEMO_BACKUP_VERSION,
    note: "Fictional browser-local demo only. Never use for real financial data.",
    exportedAt,
    accountIds: expectedAccountIds,
    openingBalancesCents: accountDefinitions.map((a) => a.openingCents),
    entries,
  };
}

export function createDemoBackup(entries, exportedAt = new Date().toISOString()) {
  const normalized = validateDemoEntries(entries);
  if (typeof exportedAt !== "string" || Number.isNaN(Date.parse(exportedAt))) {
    throw new Error("Invalid export date.");
  }
  return JSON.stringify(makeRecord(normalized, exportedAt), null, 2) + "\n";
}

export function parseDemoBackup(text) {
  if (typeof text !== "string" || text.length > DEMO_MAX_BYTES) {
    throw new Error("The backup must be JSON and smaller than 1 MB.");
  }
  let record;
  try {
    record = JSON.parse(text);
  } catch {
    throw new Error("The file is not valid JSON.");
  }
  if (record === null || typeof record !== "object" ||
    record.format !== DEMO_BACKUP_FORMAT || record.version !== DEMO_BACKUP_VERSION) {
    throw new Error("This file is not a supported household demo backup.");
  }
  if (!Array.isArray(record.accountIds) ||
    record.accountIds.length !== expectedAccountIds.length ||
    record.accountIds.some((id, i) => id !== expectedAccountIds[i])) {
    throw new Error("Backup account layout differs from this demo version.");
  }
  if (!Array.isArray(record.openingBalancesCents) ||
    record.openingBalancesCents.length !== accountDefinitions.length ||
    record.openingBalancesCents.some((value, i) => value !== accountDefinitions[i].openingCents)) {
    throw new Error("Backup opening balances differ from this demo version.");
  }
  return validateDemoEntries(record.entries);
}

/** Spreadsheet-safe CSV: prefix cells that Excel/Sheets could execute as formulas. */
function csvCell(value) {
  let s = String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

function amountUsd(cents) {
  return (cents / 100).toFixed(2);
}

export function createDemoCsv(entries) {
  const valid = validateDemoEntries(entries);
  const headers = ["Date", "Type", "Description", "Account", "From", "To", "AmountUSD"];
  const rows = valid.map(entry => [
    entry.date,
    entry.type,
    entry.description,
    entry.type === "transfer" ? "" : entry.accountId,
    entry.type === "transfer" ? entry.fromId : "",
    entry.type === "transfer" ? entry.toId : "",
    // A transfer is neither income nor an expense. The type is the source of truth.
    entry.type === "expense" ? "-" + amountUsd(entry.amountCents) : amountUsd(entry.amountCents),
  ]);
  return "\ufeff" + [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
