import Link from "next/link";

export default function LegacySignInNotice() {
  return <div className="auth-wrap">
    <div className="panel auth-panel">
      <p className="eyebrow">ARCHITECTURE UPGRADE</p>
      <h1>A simpler sign-in is coming.</h1>
      <p className="muted">
        We are replacing the earlier Supabase experiment with a Cloudflare-only
        budgeting app. Registration and sign-in on this legacy site are paused.
      </p>
      <div className="demo-warning">
        <strong>No action needed.</strong> You do not need to confirm the old email
        or make another account yet. Our new version will use browser passkeys
        after its security testing is complete.
      </div>
      <Link href="/" className="text-link">Back to the working fictional-money demo →</Link>
    </div>
  </div>;
}
