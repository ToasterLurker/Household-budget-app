import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Household Budget — Demo",
  description: "Private household budgeting app — demonstration interface",
};

const navItems = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/accounts", label: "Accounts", icon: "▤" },
  { href: "/transactions", label: "Transactions", icon: "⇄" },
  { href: "/contributions", label: "Contributions", icon: "◷" },
  { href: "/savings", label: "Savings", icon: "◎" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <aside className="sidebar" aria-label="Main navigation">
            <Link className="brand" href="/">◈ <span>Household Budget</span></Link>
            <nav className="side-nav">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="nav-link">
                  <span aria-hidden="true">{item.icon}</span><span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="sidebar-note">Demo mode · No bank data connected</div>
          </aside>
          <div className="main-area">
            <header className="topbar">
              <Link className="mobile-brand" href="/">◈ Household Budget</Link>
              <div className="topbar-meta"><span className="status-dot" /> Demo workspace</div>
            </header>
            <main id="main-content" className="content">{children}</main>
          </div>
          <nav className="bottom-nav" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link href={item.href} key={item.href} className="bottom-link">
                <span aria-hidden="true">{item.icon}</span><span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </body>
    </html>
  );
}
