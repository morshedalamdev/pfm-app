"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  matchesNavigationItem,
  navigationGroups,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col gap-4 px-2 py-4 lg:px-3">
      <Link
        href="/"
        className="flex min-h-11 items-center justify-center rounded-md px-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring lg:justify-start"
        aria-label="Infiny PFM overview"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
          IP
        </span>
        <span className="ml-2 hidden text-sm font-bold lg:inline">
          Infiny PFM
        </span>
      </Link>

      <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-5">
        {navigationGroups.map((group) => (
          <section key={group.id} className="space-y-1">
            <p className="hidden px-2 text-xs font-bold uppercase text-navigation-muted lg:block">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = matchesNavigationItem(pathname, item);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center justify-center rounded-md px-2 text-sm font-semibold text-navigation-muted transition-colors focus-visible:ring-sidebar-ring lg:justify-start",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive &&
                        "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <span className="sr-only lg:not-sr-only lg:ml-2">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </div>
  );
}
