import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = process.cwd();

test("all six planned routes and shared demo UI exist", () => {
  for (const path of [
    "app/page.tsx", "app/[section]/page.tsx", "app/layout.tsx",
    "app/globals.css", "components/demo-workspace.tsx", "lib/ledger-core.mjs",
  ]) {
    assert.ok(existsSync(root + "/" + path), "Missing " + path);
  }
  const layout = readFileSync(root + "/app/layout.tsx", "utf8");
  for (const label of ["Home", "Accounts", "Transactions", "Contributions", "Savings", "Settings"]) {
    assert.ok(layout.includes('label: "' + label + '"'), "Missing " + label);
  }
});

test("live demo interface clearly discloses fictional local-only data", () => {
  const workspace = readFileSync(root + "/components/demo-workspace.tsx", "utf8");
  assert.match(workspace, /Fictional balances and transactions/);
  assert.match(workspace, /do not enter real financial information/i);
  assert.match(workspace, /localStorage/);
});

test("new money calculations are centralized in pure ledger engine", () => {
  const workspace = readFileSync(root + "/components/demo-workspace.tsx", "utf8");
  assert.match(workspace, /balanceFor/);
  assert.match(workspace, /canTransfer/);
  assert.match(workspace, /parseDollars/);
});
