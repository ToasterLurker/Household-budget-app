import { notFound } from "next/navigation";
import { accounts, formatMoney, transactions } from "@/lib/demo";

const sections = {
  accounts: { title: "Accounts", description: "Personal and shared accounts, each tracked independently." },
  transactions: { title: "Transactions", description: "Search, edit, and reconcile activity in a future checkpoint." },
  contributions: { title: "Contributions", description: "Weekly bill-pay and grocery funding, split equally." },
  savings: { title: "Savings", description: "Optional personal savings, virtual allocations, and goals." },
  settings: { title: "Settings", description: "Account access, notifications, and household preferences." },
} as const;

type Section = keyof typeof sections;
export function generateStaticParams() {
  return Object.keys(sections).map(section => ({ section }));
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(section in sections)) notFound();
  const info = sections[section as Section];
  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">DEMO WORKSPACE</p><h1>{info.title}</h1><p className="muted">{info.description}</p></div>
        <span className="demo-pill">Not connected</span>
      </div>
      {section === "accounts" ? (
        <div className="card-grid">
          {accounts.map(a => <article key={a.id} className="panel">
            <div className="panel-top"><span className={`account-dot ${a.color}`}/><h3>{a.name}</h3><span className="tag">{a.owner}</span></div>
            <p className="panel-money">{formatMoney(a.balanceCents)}</p><p className="muted">Fictional example balance</p>
          </article>)}
        </div>
      ) : section === "transactions" ? (
        <div className="panel">
          {transactions.map(tx => <div key={tx.id} className="transaction-row">
            <div><strong>{tx.title}</strong><p className="muted">{tx.account} · {tx.date} · {tx.kind}</p></div>
            <strong className={tx.amountCents>0?"positive":""}>{formatMoney(tx.amountCents)}</strong>
          </div>)}
        </div>
      ) : section === "contributions" ? (
        <div className="card-grid">
          <article className="panel"><h3>Bill-Pay</h3><p className="panel-money">$300.00</p><p className="muted">Example contribution per person, each Friday</p></article>
          <article className="panel"><h3>Groceries</h3><p className="panel-money">$75.00</p><p className="muted">Example contribution per person, each Friday</p></article>
        </div>
      ) : section === "savings" ? (
        <div className="panel empty-panel"><span aria-hidden="true">◎</span><h3>Savings, your way</h3><p className="muted">This will support optional virtual savings, real accounts, and custom goals. No default personal savings requirements.</p></div>
      ) : (
        <div className="panel empty-panel"><span aria-hidden="true">⚙</span><h3>Preferences coming later</h3><p className="muted">Personal accounts will default to private; both members will control shared household settings.</p></div>
      )}
      <p className="footnote">All amounts shown are examples. Changes and saving are intentionally disabled in this first checkpoint.</p>
    </>
  );
}
