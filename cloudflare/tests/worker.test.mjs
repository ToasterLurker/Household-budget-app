import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/worker.mjs";

const origin = "https://household-budget.example.workers.dev";
const request = (path, method = "GET") => new Request(origin + path, { method });

test("public status reveals only staging flags and database readiness", async () => {
  const env = { DB: { prepare: () => ({ first: async () => ({ value: "1" }) }) } };
  const response = await handleRequest(request("/api/status"), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.database, "ready");
  assert.equal(body.authentication, "disabled-pending-passkey-review");
  assert.equal(body.financial_writes, false);
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("database unavailability does not enable the private API", async () => {
  const response = await handleRequest(request("/api/status"), {
    DB: { prepare: () => { throw Error("unavailable"); } },
  });
  assert.equal((await response.json()).database, "not_initialized");
});

test("private API routes never authorize a request before auth is ready", async () => {
  const targets = [
    "/api/session", "/api/accounts", "/api/ledger", "/api/passkeys/register",
    "/api/passkeys/login", "/api/household/invite", "/api/transfer", "/api/recovery",
  ];
  for (const target of targets) {
    const response = await handleRequest(request(target), {});
    assert.equal(response.status, 503, target);
    assert.match((await response.json()).error, /disabled/i);
  }
});

test("all client mutation routes are disabled even with forged cookies", async () => {
  const response = await handleRequest(
    new Request(origin + "/api/ledger", {
      method: "POST",
      headers: { cookie: "session=forged-token", "content-type": "application/json" },
      body: JSON.stringify({ cents: 100 }),
    }), {},
  );
  assert.equal(response.status, 405);
});

test("static files are served without accessing a financial database", async () => {
  let received = "";
  const response = await handleRequest(request("/"), {
    ASSETS: { fetch: async r => { received = r.url; return new Response("safe demo"); } },
  });
  assert.equal(await response.text(), "safe demo");
  assert.equal(received, origin + "/");
});

test("missing assets fail safely instead of returning a fake success", async () => {
  assert.equal((await handleRequest(request("/"), {})).status, 503);
});
