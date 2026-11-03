import test from "node:test";
import assert from "node:assert/strict";
import { accountDefinitions, demoEntries, balanceFor } from "../lib/ledger-core.mjs";
import {
  createDemoBackup, createDemoCsv, parseDemoBackup, validateDemoEntries, DEMO_MAX_ENTRIES,
} from "../lib/demo-portability.mjs";

test("JSON export/import is lossless for fictional balances and transfers", () => {
  const json = createDemoBackup(demoEntries, "2026-11-03T19:00:00.000Z");
  const parsed = parseDemoBackup(json);
  assert.deepEqual(parsed, demoEntries);
  for (const account of accountDefinitions) {
    assert.equal(balanceFor(account.id, parsed), balanceFor(account.id, demoEntries));
  }
  assert.ok(json.includes('"format": "household-budget-demo"'));
});

test("backup rejects unknown format versions, account layouts and opening balances", () => {
  const record = JSON.parse(createDemoBackup(demoEntries));
  assert.throws(() => parseDemoBackup(JSON.stringify({ ...record, version: 99 })), /supported/);
  assert.throws(() => parseDemoBackup(JSON.stringify({ ...record, accountIds: ["personal"] })), /layout/);
  assert.throws(() => parseDemoBackup(JSON.stringify({ ...record, openingBalancesCents: [0, 0, 0] })), /opening balances/);
});

test("backup rejects duplicate IDs, invented accounts, invalid dates and unsafe amounts", () => {
  const record = JSON.parse(createDemoBackup(demoEntries));
  assert.throws(() => parseDemoBackup(JSON.stringify({ ...record, entries: [demoEntries[0], demoEntries[0]] })), /duplicate/);
  assert.throws(() => parseDemoBackup(JSON.stringify({ ...record,
    entries: [{ ...demoEntries[0], accountId: "forged" }] })), /invalid/);
  assert.throws(() => parseDemoBackup(JSON.stringify({ ...record,
    entries: [{ ...demoEntries[0], date: "2026-02-30" }] })), /invalid/);
  assert.throws(() => parseDemoBackup(JSON.stringify({ ...record,
    entries: [{ ...demoEntries[0], amountCents: 0 }] })), /invalid/);
  assert.throws(() => validateDemoEntries(new Array(DEMO_MAX_ENTRIES + 1)), /too many/);
});

test("backup drops unknown imported fields rather than persisting them", () => {
  const record = JSON.parse(createDemoBackup(demoEntries));
  record.entries[0].secret = "unsafe imported data";
  const parsed = parseDemoBackup(JSON.stringify(record));
  assert.ok(!("secret" in parsed[0]));
});

test("CSV export quotes text and neutralizes spreadsheet formula injection", () => {
  const sample = [
    { ...demoEntries[0], id: "formula1", description: '=HYPERLINK("https://example.invalid","click")' },
    { ...demoEntries[3], id: "formula2", description: "@SUM(1,1)" },
  ];
  const csv = createDemoCsv(sample);
  assert.ok(csv.startsWith("\ufeff"));
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example.invalid"",""click""\)"/);
  assert.match(csv, /"'@SUM\(1,1\)"/);
  assert.match(csv, /"-86\.42"/);
});

test("bad files fail without changing an existing ledger", () => {
  assert.throws(() => parseDemoBackup("not-json"), /not valid JSON/);
  assert.throws(() => parseDemoBackup("x".repeat(1024 * 1024 + 1)), /smaller than/);
  assert.deepEqual(validateDemoEntries([]), []);
});
