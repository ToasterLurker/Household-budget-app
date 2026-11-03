import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const migrationPath = "supabase/migrations/202611030001_secure_household_foundation.sql";
const sql = readFileSync(migrationPath, "utf8");

test("security foundation has a single explicit Supabase migration", () => {
  assert.ok(existsSync(migrationPath));
  for (const name of ["profiles", "households", "household_members", "household_invites", "accounts", "ledger_entries"]) {
    assert.match(sql, new RegExp("alter table public\\." + name + " enable row level security", "i"));
  }
});

test("personal history requires full sharing while shared history requires membership", () => {
  assert.match(sql, /private\.can_view_history\(account_id\)/);
  assert.match(sql, /a\.kind <> 'personal' or a\.visibility = 'full'/);
  assert.match(sql, /a\.owner_user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /private\.is_member\(a\.household_id\)/);
  assert.match(sql, /kind <> 'personal' or visibility <> 'private'/);
});

test("client roles cannot directly write accounts or the journal", () => {
  assert.match(sql, /revoke all on public\.profiles, public\.households, public\.household_members,/);
  assert.match(sql, /public\.household_invites, public\.accounts, public\.ledger_entries from anon, authenticated/);
  assert.doesNotMatch(sql, /grant\s+(insert|delete)\s+on\s+public\.accounts\s+to\s+authenticated/i);
  assert.doesNotMatch(sql, /grant\s+(insert|delete)\s+on\s+public\.ledger_entries\s+to\s+authenticated/i);
});

test("household invitations are 32-byte random single-use tokens and membership is capped at two", () => {
  assert.match(sql, /extensions\.gen_random_bytes\(32\)/);
  assert.match(sql, /extensions\.digest\(_code, 'sha256'\)/);
  assert.match(sql, /_invite\.used_at is not null/);
  assert.match(sql, /expires_at <= now\(\)/);
  assert.match(sql, /household_id = _invite\.household_id\) >= 2/);
});

test("server auth verifies claims and fail-closed route is present", () => {
  for (const filename of [
    "app/sign-in/actions.ts", "app/sign-in/page.tsx", "app/secure/page.tsx",
    "app/auth/callback/route.ts", "lib/supabase/server.ts", "proxy.ts",
  ]) assert.ok(existsSync(filename), filename);
  assert.match(readFileSync("app/secure/page.tsx", "utf8"), /auth\.getClaims\(\)/);
  assert.match(readFileSync("proxy.ts", "utf8"), /auth\.getClaims\(\)/);
  const page = readFileSync("app/secure/page.tsx", "utf8");
  assert.match(page, /if \(!client\)/);
  assert.match(page, /database is not connected to this deployment yet/);
});

test("client invitation codes are not placed in URLs or committed", () => {
  const src = readFileSync("components/household-invitations.tsx", "utf8");
  assert.match(src, /setCode\(data\)/);
  assert.doesNotMatch(src, /searchParams\.set|window\.location/);
});
