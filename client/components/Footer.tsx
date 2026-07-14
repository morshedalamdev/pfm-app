"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BellIcon,
  CircleEllipsisIcon,
  FileTextIcon,
  InfoIcon,
  KeyRoundIcon,
  LockIcon,
  LogOutIcon,
  MessageCircleMoreIcon,
  PlusIcon,
  SettingsIcon,
  SquarePenIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react";

import type { components } from "@/generated/api-types";
import { apiGet } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";
import {
  navigationGroups,
  navigationItems,
  getMobileNavigationMode,
  matchesNavigationItem,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type NotificationUnreadCountResponse =
  components["schemas"]["NotificationUnreadCountResponse"];

type MobileMenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const homeItem = navigationItems.find((item) => item.href === "/");
const reportsItem = navigationItems.find((item) => item.href === "/analytics");
const planItems = navigationGroups.find((group) => group.id === "plan")?.items ?? [];
const accountsItem = navigationItems.find((item) => item.href === "/accounts");
const settingsItem = navigationItems.find((item) => item.href === "/settings");

const addItems: MobileMenuItem[] = [
  {
    href: "/transaction/create",
    label: "Add Transaction",
    icon: navigationItems.find((item) => item.href === "/transaction")!.icon,
  },
  {
    href: "/accounts/create",
    label: "Add Account",
    icon: accountsItem!.icon,
  },
  {
    href: "/savings/create",
    label: "Add Savings Goal",
    icon: navigationItems.find((item) => item.href === "/savings")!.icon,
  },
  {
    href: "/loan/create",
    label: "Add Loan or Debt",
    icon: navigationItems.find((item) => item.href === "/loan")!.icon,
  },
];

const supportActions = [
  { label: "What is Infiny PFM", icon: InfoIcon },
  { label: "Privacy Notice", icon: LockIcon },
  { label: "User Agreement", icon: FileTextIcon },
  { label: "Contact Us", icon: MessageCircleMoreIcon },
] as const;

export default function Footer() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const displayName = user?.full_name ?? user?.email?.split("@")[0] ?? "Profile";
  const displayEmail = user?.email ?? "Not signed in";
  const PlanIcon = planItems[0]?.icon;
  const mobileNavigationMode = getMobileNavigationMode(pathname);
  const isReduced = mobileNavigationMode === "reduced";

  useEffect(() => {
    let isMounted = true;

    async function loadUnreadCount() {
      try {
        const response = await apiGet<NotificationUnreadCountResponse>(
          "/api/v1/notifications/unread-count",
        );
        if (isMounted) {
          setUnreadCount(response.unread_count);
        }
      } catch {
        if (isMounted) {
          setUnreadCount(null);
        }
      }
    }

    void loadUnreadCount();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/login");
  };

  if (
    mobileNavigationMode === "hidden" ||
    !homeItem ||
    !reportsItem
  ) {
    return null;
  }

  const isPlanActive = planItems.some((item) =>
    matchesNavigationItem(pathname, item),
  );

  return (
    <footer className="fixed inset-x-0 bottom-0 z-[var(--z-shell-navigation)] px-2 pb-[calc(0.5rem+var(--pfm-shell-safe-bottom))]">
      <nav
        aria-label="Mobile navigation"
        className="mx-auto grid h-16 max-w-md grid-cols-5 items-end gap-1 rounded-md border border-border bg-navigation-background px-2 pb-2 pt-1 text-navigation-foreground shadow-[var(--shadow-floating)] backdrop-blur"
      >
        <MobileNavLink
          href={homeItem.href}
          label="Home"
          icon={homeItem.icon}
          active={matchesNavigationItem(pathname, homeItem)}
        />
        <MobileNavLink
          href={reportsItem.href}
          label="Reports"
          icon={reportsItem.icon}
          active={matchesNavigationItem(pathname, reportsItem)}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "group flex flex-col items-center gap-1 text-xs font-bold text-navigation-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isReduced ? "min-h-12 justify-center" : "-mt-7 min-h-16 justify-start",
              )}
              aria-label="Open add menu"
            >
              <span
                className={cn(
                  "grid place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-primary-glow)] transition-transform group-hover:-translate-y-0.5",
                  isReduced ? "size-8" : "size-12",
                )}
              >
                <PlusIcon className={isReduced ? "size-4" : "size-6"} aria-hidden="true" />
              </span>
              <span>Add</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="center" className="w-56">
            <DropdownMenuLabel>Add</DropdownMenuLabel>
            {addItems.map((item) => (
              <DropdownLinkItem key={item.href} item={item} />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={mobileButtonClass(isPlanActive)}
              aria-label="Open plan menu"
              aria-current={isPlanActive ? "page" : undefined}
            >
              {PlanIcon ? <PlanIcon className="size-5" aria-hidden="true" /> : null}
              <span>Plan</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="center" className="w-56">
            <DropdownMenuLabel>Plan</DropdownMenuLabel>
            {planItems.map((item) => (
              <DropdownLinkItem
                key={item.href}
                item={{
                  href: item.href,
                  label: item.label,
                  icon: item.icon,
                }}
              />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={mobileButtonClass(false)}
              aria-label="Open more menu"
            >
              <span className="relative">
                <CircleEllipsisIcon className="size-5" aria-hidden="true" />
                {unreadCount ? (
                  <span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </span>
              <span>More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-64">
            <DropdownMenuLabel>
              <span className="block truncate text-sm">{displayName}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {displayEmail}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <BellIcon aria-hidden="true" />
              {unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
            </DropdownMenuItem>
            <DropdownLinkItem
              item={{ href: "/profile", label: "Profile", icon: SquarePenIcon }}
            />
            {accountsItem ? (
              <DropdownLinkItem
                item={{
                  href: accountsItem.href,
                  label: accountsItem.label,
                  icon: accountsItem.icon,
                }}
              />
            ) : null}
            {settingsItem ? (
              <DropdownLinkItem
                item={{
                  href: settingsItem.href,
                  label: settingsItem.label,
                  icon: SettingsIcon,
                }}
              />
            ) : null}
            <DropdownLinkItem
              item={{
                href: "/auth/forgot-password",
                label: "Reset Password",
                icon: KeyRoundIcon,
              }}
            />
            <DropdownMenuItem>
              <Trash2Icon aria-hidden="true" />
              Delete Account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {supportActions.map((action) => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem key={action.label}>
                  <Icon aria-hidden="true" />
                  {action.label}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={status === "loading"}
              onSelect={(event) => {
                event.preventDefault();
                void handleLogout();
              }}
            >
              <LogOutIcon aria-hidden="true" />
              {status === "loading" ? "Logging out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </footer>
  );
}

function MobileNavLink({
  href,
  label,
  icon: Icon,
  active,
}: MobileMenuItem & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={mobileButtonClass(active)}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

function DropdownLinkItem({ item }: { item: MobileMenuItem }) {
  const Icon = item.icon;

  return (
    <DropdownMenuItem asChild>
      <Link href={item.href}>
        <Icon aria-hidden="true" />
        {item.label}
      </Link>
    </DropdownMenuItem>
  );
}

function mobileButtonClass(active: boolean) {
  return cn(
    "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-1 text-xs font-bold text-navigation-muted outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "hover:bg-accent hover:text-accent-foreground",
    active && "bg-primary-soft text-primary-soft-foreground",
  );
}
