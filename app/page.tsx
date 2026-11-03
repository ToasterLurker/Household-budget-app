import Link from "next/link";
import { accounts, formatMoney } from "@/lib/demo";

export default function Home() {
  const personal = accounts[0];
  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">OVERVIEW</p><h1>Household Dashboard</h1><p className="muted">Your finances at a glance.</p></div>
        <span className="demo-pill">Sample data only</span>
      </div>
      <div className="hero-card">
        <p className="hero-label">Your personal account balance <span className="subtle">· Demo</span></p>
        <strong className="hero-money">{formatMoney(personal.balanceCents)}</strong>
        <p>This is an example account balance, not a calculated safe-to-spend amount.</p>
        <Link href="/accounts" className="text-link">View accounts →</Link>
      </div>
      <section className="section-heading"><h2>Shared household</h2><p className="muted">Balances stay separate so shortages never get hidden.</p></section>
      <div className="card-grid">
        {accounts.filter(a => a.owner === "Shared").map((account) => (
          <article className="panel" key={account.id}>
            <div className="panel-top"><span className={`account-dot ${account.color}`} /><h3>{account.name}</h3></div>
            <p className="panel-money">{formatMoney(account.balanceCents)}</p>
            <p className="muted">Demonstration balance</p>
          </article>
        ))}
      </div>
      <section className="section-heading"><h2>Coming up</h2></section>
      <div className="panel">
        <div className="event-row"><div><strong>Friday funding</strong><p className="muted">Shared weekly contributions · planned feature</p></div><span className="tag">Demo</span></div>
        <div className="event-row"><div><strong>Financial forecast</strong><p className="muted">Due dates and shortage detection will arrive in a later checkpoint.</p></div><span className="tag">Later</span></div>
      </div>
      <p className="footnote">Checkpoint 1 is a visual prototype. No accounts, transactions, or forecasts are stored or calculated.</p>
    </>
  );
}
