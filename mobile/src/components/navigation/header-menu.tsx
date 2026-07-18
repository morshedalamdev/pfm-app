"use client";

import {
  Bell,
  CalendarClock,
  Ellipsis,
  Goal,
  Landmark,
  Settings,
  Tags,
  WalletCards,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const menuLinks = [
  { href: "/accounts", icon: Landmark, label: "Accounts" },
  { href: "/budget", icon: WalletCards, label: "Budget" },
  { href: "/goal", icon: Goal, label: "Goals" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/transaction/recurring", icon: CalendarClock, label: "Recurring" },
  { href: "/settings/categories", icon: Tags, label: "Categories" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const;

function routeIsActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <DrawerTrigger asChild>
        <button aria-label="Open menu" className="header-menu-trigger" type="button">
          <Ellipsis aria-hidden="true" size={23} strokeWidth={2.4} />
        </button>
      </DrawerTrigger>
      <DrawerContent aria-describedby="header-menu-description">
        <DrawerHeader>
          <div>
            <p className="eyebrow">YOUR SPACE</p>
            <DrawerTitle>Menu</DrawerTitle>
            <DrawerDescription id="header-menu-description">
              Manage your money tools and preferences.
            </DrawerDescription>
          </div>
          <DrawerClose aria-label="Close menu" className="drawer-close-button">
            <X aria-hidden="true" size={20} />
          </DrawerClose>
        </DrawerHeader>

        <nav aria-label="Menu links" className="header-menu-links">
          {menuLinks.map(({ href, icon: Icon, label }) => (
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
        </nav>

        <section aria-labelledby="menu-appearance-heading" className="header-menu-preferences">
          <div>
            <p className="eyebrow">APPEARANCE</p>
            <h2 id="menu-appearance-heading">Choose your theme</h2>
          </div>
          <ThemeToggle />
        </section>
        <LogoutButton />
      </DrawerContent>
    </Drawer>
  );
}
