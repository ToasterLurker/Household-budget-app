import test from "node:test";
import assert from "node:assert/strict";
import {
  balanceFor, canTransfer, contributionsThisWeek, demoEntries,
  formatMoney, isLedgerEntry, mondayOfWeek, parseDollars, totalsFor,
} from "../lib/ledger-core.mjs";

test("USD amounts use exact cents, rejecting excessive precision and invalid inputs", () => {
  assert.equal(parseDollars("0.01"), 1);
  assert.equal(parseDollars("42"), 4200);
  assert.equal(parseDollars("42.5"), 4250);
  assert.equal(parseDollars("9999999.99"), 999999999);
  for (const amount of ["0", "0.00", "-1", "1.001", "2e3", "NaN", "10000000", "1,000.00", ""]) {
    assert.equal(parseDollars(amount), null, amount);
  }
});

test("initial fictional balances equal opening balances plus seeded ledger entries", () => {
  assert.equal(balanceFor("personal", demoEntries), 203283);
  assert.equal(balanceFor("bills", demoEntries), 155635);
  assert.equal(balanceFor("groceries", demoEntries), 28858);
});

test("transfers preserve household total and are not counted as expenses", () => {
  const before = ["personal", "bills", "groceries"].reduce((sum, id) => sum + balanceFor(id, []), 0);
  const onlyTransfer = [{
    id: "transfer-one", type: "transfer", fromId: "personal",
    toId: "bills", amountCents: 7654, description: "Test transfer", date: "2026-11-03",
  }];
  const after = ["personal", "bills", "groceries"].reduce((sum, id) => sum + balanceFor(id, onlyTransfer), 0);
  assert.equal(before, after);
  assert.deepEqual(totalsFor(onlyTransfer), { expensesCents: 0, incomeCents: 0, transfersCents: 7654 });
});

test("transfer checks prevent same-account moves and overdrafting", () => {
  assert.equal(canTransfer("personal", "personal", 1, demoEntries), false);
  assert.equal(canTransfer("personal", "bills", 203284, demoEntries), false);
  assert.equal(canTransfer("personal", "bills", 203283, demoEntries), true);
});

test("entry validation rejects forged destinations and zero amounts", () => {
  assert.equal(isLedgerEntry(demoEntries[0]), true);
  assert.equal(isLedgerEntry({ ...demoEntries[0], amountCents: 0 }), false);
  assert.equal(isLedgerEntry({ ...demoEntries[1], toId: "unknown" }), false);
});

test("weekly contributions include only current-week personal-to-shared transfers", () => {
  const now = new Date(2026, 10, 3); // Tuesday, Nov 3, 2026
  assert.equal(mondayOfWeek(now), "2026-11-02");
  assert.equal(contributionsThisWeek(demoEntries, "bills", now), 0);
  const extra = {
    id: "current-week", type: "transfer", fromId: "personal", toId: "bills",
    amountCents: 18000, description: "Friday funding", date: "2026-11-06",
  };
  assert.equal(contributionsThisWeek([...demoEntries, extra], "bills", now), 18000);
});

test("format money displays signs and exact cents", () => {
  assert.equal(formatMoney(-42), "-$0.42");
  assert.equal(formatMoney(4200, true), "+$42.00");
});
