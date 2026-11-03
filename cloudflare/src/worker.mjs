/**
 * Cloudflare Worker entrypoint — staging, fail-closed.
 * Serves public *fictional* demo assets and nothing else until passkey
 * authentication, recovery and authorization tests pass.
 */
const json = (value, status=200) => new Response(JSON.stringify(value), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, private",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
  },
});

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/api" || path.startsWith("/api/")) {
    if (request.method !== "GET") return json({ error: "Method not available in the demo." }, 405);
    if (path === "/api/status") {
      let db = "not_initialized";
      try {
        if (env?.DB) {
          const row = await env.DB.prepare("SELECT value FROM schema_meta WHERE key='schema_version'").first();
          if (row?.value === "1") db = "ready";
        }
      } catch {
        db = "not_initialized";
      }
      return json({
        deployment: "cloudflare-staging",
        application: "fictional-demo",
        database: db,
        authentication: "disabled-pending-passkey-review",
        financial_writes: false,
      });
    }
    // Zero chance of bypassing authentication through forgotten routes.
    return json({ error: "Private API is disabled until passkey access checks pass." }, 503);
  }
  if (env?.ASSETS) return env.ASSETS.fetch(request);
  return new Response("The demonstration assets have not been deployed.", {
    status: 503, headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
  });
}

export default { fetch: handleRequest };
