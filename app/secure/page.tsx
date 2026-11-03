import Link from "next/link";

export default function LegacySecureNotice() {
  return <div className="secure-wrap">
    <p className="eyebrow">SECURE LOGIN MIGRATION</p>
    <h1>Cloudflare development is underway.</h1>
    <div className="demo-warning">
      <strong>Supabase sign-in has been retired from this demo.</strong>
      We are moving the future private accounts, shared household,
      and transaction database to Cloudflare Workers and D1.
    </div>
    <p className="muted">
      Keep using the browser-local fictional demo for now. No real financial
      details should be entered until two-user security and backups pass testing.
    </p>
    <Link href="/" className="text-link">Return to the original demo →</Link>
  </div>;
}
