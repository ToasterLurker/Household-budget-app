import type { LedgerEntry } from "./ledger-core.mjs";
export const DEMO_BACKUP_FORMAT: "household-budget-demo";
export const DEMO_BACKUP_VERSION: 1;
export const DEMO_MAX_ENTRIES: 2000;
export const DEMO_MAX_BYTES: 1048576;
export function validateDemoEntries(entries: unknown): LedgerEntry[];
export function createDemoBackup(entries: readonly LedgerEntry[], exportedAt?: string): string;
export function parseDemoBackup(text: string): LedgerEntry[];
export function createDemoCsv(entries: readonly LedgerEntry[]): string;
