import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = process.cwd();

test("checkpoint 1 routes exist", () => {
  for (const path of ["app/page.tsx", "app/[section]/page.tsx", "app/layout.tsx", "app/globals.css", "lib/demo.ts"]) {
    assert.ok(existsSync(`${root}/${path}`), `Missing ${path}`);
  }
});

test("section navigation includes six planned screens", () => {
  const layout = readFileSync(`${root}/app/layout.tsx`, "utf8");
  for (const label of ["Home", "Accounts", "Transactions", "Contributions", "Savings", "Settings"]) {
    assert.ok(layout.includes(`label: "${label}"`), `Missing ${label}`);
  }
});

test("demo data is explicitly identified", () => {
  const data = readFileSync(`${root}/lib/demo.ts`, "utf8");
  assert.match(data, /Fictional data ONLY/);
  const home = readFileSync(`${root}/app/page.tsx`, "utf8");
  assert.match(home, /Sample data only/);
});
