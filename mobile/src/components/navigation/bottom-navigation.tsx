"use client";

import {
  BarChart3,
  HandCoins,
  Home,
  Plus,
  ReceiptText,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/transaction", icon: ReceiptText, label: "Transaction" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/loan", icon: HandCoins, label: "Loan" },
] as const;

function routeIsActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNavigation() {
  const pathname = usePathname();

  const home = primaryItems[0];
  const transaction = primaryItems[1];
  const analytics = primaryItems[2];
  const loan = primaryItems[3];
  const AnalyticsIcon = analytics.icon;
  const LoanIcon = loan.icon;

  return (
    <nav aria-label="Primary" className="bottom-navigation">
      {[home, transaction].map(({ href, icon: Icon, label }) => {
        const isActive = routeIsActive(pathname, href) && !(
          href === "/transaction" && pathname.startsWith("/transaction/recurring")
        );

        return <Link
          aria-current={isActive ? "page" : undefined}
          className="nav-item"
          href={href as Route}
          key={href}
        >
          <Icon aria-hidden="true" size={21} strokeWidth={2.4} />
          <span>{label}</span>
        </Link>;
      })}

      <Link aria-label="Add transaction" className="add-button" href={"/transaction/new" as Route}>
        <Plus aria-hidden="true" size={30} strokeWidth={2.2} />
      </Link>

      <Link
        aria-current={routeIsActive(pathname, analytics.href) ? "page" : undefined}
        className="nav-item"
        href={analytics.href as Route}
      >
        <AnalyticsIcon aria-hidden="true" size={21} strokeWidth={2.4} />
        <span>{analytics.label}</span>
      </Link>
      <Link
        aria-current={routeIsActive(pathname, loan.href) ? "page" : undefined}
        className="nav-item"
        href={loan.href as Route}
      >
        <LoanIcon aria-hidden="true" size={21} strokeWidth={2.4} />
        <span>{loan.label}</span>
      </Link>
    </nav>
  );
}
