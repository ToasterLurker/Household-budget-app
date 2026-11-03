import test from "node:test";
import assert from "node:assert/strict";
import {
  balanceFor, canTransfer, demoEntries, parseDollars, totalsFor,
} from "../src/shared/ledger-core.mjs";
import {
  createDemoBackup, parseDemoBackup, createDemoCsv,
} from "../src/shared/demo-portability.mjs";

test("browser demo round-trips as a restorable JSON backup", () => {
  const backup = createDemoBackup(demoEntries);
  const restored = parseDemoBackup(backup);
  assert.deepEqual(restored, demoEntries);
  for (const id of ["personal", "bills", "groceries"]) {
    assert.equal(balanceFor(id, restored), balanceFor(id, demoEntries));
  }
});

test("money parser accepts integer cents only", () => {
  assert.equal(parseDollars("14.20"), 1420);
  assert.equal(parseDollars("0.01"), 1);
  assert.equal(parseDollars("14.203"), null);
  assert.equal(parseDollars("-1.00"), null);
});

test("transfers preserve household total and are separate from expenses", () => {
  const transfer = {
    id: "example-transfer", type: "transfer", fromId: "personal", toId: "bills",
    amountCents: 515, date: "2026-11-03", description: "Synthetic example",
  };
  const before = ["personal","bills","groceries"].reduce((s,id)=>s+balanceFor(id,demoEntries),0);
  const after = ["personal","bills","groceries"].reduce((s,id)=>s+balanceFor(id,[...demoEntries,transfer]),0);
  assert.equal(after,before);
  assert.equal(totalsFor([transfer]).expensesCents,0);
  assert.equal(canTransfer("personal","personal",515,demoEntries),false);
});

test("CSV export neutralizes spreadsheet formula-like descriptions", () => {
  const data = [{ ...demoEntries[0], description:'=HYPERLINK("https://example.invalid","wrong")' }];
  const csv = createDemoCsv(data);
  assert.match(csv,/"'=HYPERLINK/);
});
