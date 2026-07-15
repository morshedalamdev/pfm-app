"use client";

import { BarChart3, Home, Plus, Settings, WalletCards } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/report", icon: BarChart3, label: "Report" },
  { href: "/plan", icon: WalletCards, label: "Plan" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="bottom-navigation">
      {items.slice(0, 2).map(({ href, icon: Icon, label }) => (
        <Link
          aria-current={pathname === href ? "page" : undefined}
          className="nav-item"
          href={href as Route}
          key={href}
        >
          <Icon aria-hidden="true" size={21} strokeWidth={2.4} />
          <span>{label}</span>
        </Link>
      ))}

      <button aria-label="Add transaction" className="add-button" type="button">
        <Plus aria-hidden="true" size={30} strokeWidth={2.2} />
      </button>

      {items.slice(2).map(({ href, icon: Icon, label }) => (
        <Link
          aria-current={pathname === href ? "page" : undefined}
          className="nav-item"
          href={href as Route}
          key={href}
        >
          <Icon aria-hidden="true" size={21} strokeWidth={2.4} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
