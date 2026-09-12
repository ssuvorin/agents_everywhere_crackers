"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cx } from "@/lib/cx";

const workspaceLinks = [
  { index: "01", label: "Ask", href: "/ask" },
  { index: "02", label: "Graph", href: "/graph" },
  { index: "03", label: "Import", href: "/import" },
  { index: "04", label: "Slack agent", href: "/graph#slack" },
];

interface AppShellProps {
  title: string;
  children: ReactNode;
  topbarMeta?: ReactNode;
}

function NavItem({
  index,
  label,
  href,
  active,
}: (typeof workspaceLinks)[number] & { active: boolean }) {
  return (
    <Link
      className={cx("nav-link", active && "nav-link-active")}
      href={href}
      aria-current={active ? "page" : undefined}
    >
      <span className="nav-index">{index}</span>
      <span className="nav-link-label">{label}</span>
    </Link>
  );
}

export function AppShell({ title, children, topbarMeta }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link className="brand-lockup" href="/graph" aria-label="Career Brain home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Career Brain</span>
        </Link>
        <div className="nav-section-label">Workspace</div>
        <nav className="primary-nav" aria-label="Primary navigation">
          {workspaceLinks.map((link) => (
            <NavItem
              key={link.href}
              {...link}
              active={pathname.startsWith("/graph")}
            />
          ))}
        </nav>
        <div className="sidebar-account">
          <Avatar name="Maya Haddad" size={32} />
          <div className="account-copy">
            <span className="account-name">Maya Haddad</span>
            <span className="account-email">maya · dubai</span>
          </div>
        </div>
      </aside>
      <div className="shell-content">
        <header className="app-topbar">
          <span className="topbar-title">{title}</span>
          {topbarMeta}
        </header>
        <main id="main-content">{children}</main>
      </div>
    </div>
  );
}
