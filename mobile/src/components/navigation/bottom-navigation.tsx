"use client";

import {
  BarChart3,
  Bell,
  CalendarClock,
  CircleUserRound,
  Goal,
  HandCoins,
  Home,
  Landmark,
  Menu,
  Plus,
  ReceiptText,
  Settings,
  Tags,
  WalletCards,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const primaryItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/transaction", icon: ReceiptText, label: "Transaction" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
] as const;

const financeLinks = [
  { href: "/accounts", icon: Landmark, label: "Accounts" },
  { href: "/budget", icon: WalletCards, label: "Budget" },
  { href: "/goal", icon: Goal, label: "Goals" },
  { href: "/loan", icon: HandCoins, label: "Loans" },
] as const;

const personalLinks = [
  { href: "/profile", icon: CircleUserRound, label: "Profile" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/transaction/recurring", icon: CalendarClock, label: "Recurring" },
  { href: "/settings/categories", icon: Tags, label: "Categories" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const;

const moreRoutes = [
  ...financeLinks.map((item) => item.href),
  ...personalLinks.map((item) => item.href),
];

function routeIsActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function DrawerLinks({
  items,
}: {
  items: ReadonlyArray<{
    href: string;
    icon: typeof Home;
    label: string;
  }>;
}) {
  const pathname = usePathname();

  return (
    <div className="more-drawer-links">
      {items.map(({ href, icon: Icon, label }) => (
        <DrawerClose asChild key={href}>
          <Link
            aria-current={routeIsActive(pathname, href) ? "page" : undefined}
            href={href as Route}
          >
            <span className="category-icon accent-purple">
              <Icon aria-hidden="true" size={19} />
            </span>
            <span>{label}</span>
            <span aria-hidden="true">›</span>
          </Link>
        </DrawerClose>
      ))}
    </div>
  );
}

export function BottomNavigation() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const home = primaryItems[0];
  const transaction = primaryItems[1];
  const analytics = primaryItems[2];
  const AnalyticsIcon = analytics.icon;
  const moreActive = moreRoutes.some((href) => routeIsActive(pathname, href));

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

      <Drawer onOpenChange={setMoreOpen} open={moreOpen}>
        <DrawerTrigger asChild>
          <button
            aria-current={moreActive ? "page" : undefined}
            aria-label="More"
            className="nav-item"
            type="button"
          >
            <Menu aria-hidden="true" size={21} strokeWidth={2.4} />
            <span>More</span>
          </button>
        </DrawerTrigger>
        <DrawerContent aria-describedby="more-drawer-description">
          <DrawerHeader>
            <div>
              <p className="eyebrow">YOUR MONEY</p>
              <DrawerTitle>More</DrawerTitle>
              <DrawerDescription id="more-drawer-description">
                Open the tools and preferences that support your daily money flow.
              </DrawerDescription>
            </div>
            <DrawerClose aria-label="Close More" className="drawer-close-button">
              <X aria-hidden="true" size={20} />
            </DrawerClose>
          </DrawerHeader>

          <section className="more-drawer-section" aria-labelledby="finance-links-heading">
            <h2 id="finance-links-heading">Plan and manage</h2>
            <DrawerLinks items={financeLinks} />
          </section>
          <section className="more-drawer-section" aria-labelledby="personal-links-heading">
            <h2 id="personal-links-heading">Personal</h2>
            <DrawerLinks items={personalLinks} />
          </section>
        </DrawerContent>
      </Drawer>
    </nav>
  );
}
