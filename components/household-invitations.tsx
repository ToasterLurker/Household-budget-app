"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function CreateHouseholdInvite({ householdId }: { householdId: string }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true); setStatus(""); setCode("");
    const client = createSupabaseBrowserClient();
    if (!client) { setStatus("The secure backend is not connected."); setBusy(false); return; }
    const { data, error } = await client.rpc("create_household_invite", { _household_id: householdId });
    if (error || typeof data !== "string") setStatus("Could not issue an invitation. Confirm you are a member and the household is not full.");
    else { setCode(data); setStatus("Share this single-use code privately. It expires after 48 hours."); }
    setBusy(false);
  }
  return <div className="panel spaced-panel">
    <h3>Invite your partner</h3>
    <p className="muted">A member can invite one additional person using a one-time code.</p>
    <button type="button" className="action-button" onClick={create} disabled={busy}>
      {busy ? "Preparing invite…" : "Generate private invitation code"}
    </button>
    {code && <div className="invite-code-area">
      <p className="muted">Treat this code like a password. It is shown only on this screen.</p>
      <code className="invite-code">{code}</code>
      <button type="button" className="action-button secondary-action" onClick={async () => {
        try { await navigator.clipboard.writeText(code); setStatus("Code copied."); }
        catch { setStatus("Clipboard unavailable. Select and copy the code above."); }
      }}>Copy code</button>
    </div>}
    <p className="form-feedback" role="status">{status}</p>
  </div>;
}

export function JoinHouseholdInvite() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setStatus("");
    const client = createSupabaseBrowserClient();
    if (!client) { setStatus("The secure backend is not connected."); setBusy(false); return; }
    const { error } = await client.rpc("join_household_with_invite", { _code: code.trim() });
    if (error) setStatus("Could not join. The code may be incorrect, expired, or already used.");
    else { setCode(""); setStatus("Invitation accepted."); router.refresh(); }
    setBusy(false);
  }
  return <div className="panel spaced-panel">
    <h3>Join an existing household</h3>
    <p className="muted">Enter the invitation code shared by your partner.</p>
    <form className="auth-form" onSubmit={join}>
      <label>One-time invitation code
        <input type="text" value={code} onChange={e => setCode(e.target.value)}
          minLength={64} maxLength={64} pattern="[0-9a-f]{64}"
          autoComplete="off" spellCheck={false} required />
      </label>
      <button className="action-button secondary-action" disabled={busy} type="submit">
        {busy ? "Joining…" : "Join household"}
      </button>
      <p className="form-feedback" role="status">{status}</p>
    </form>
  </div>;
}
