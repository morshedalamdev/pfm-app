import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRightIcon,
  ChartNoAxesColumnIcon,
  ClipboardListIcon,
  ClipboardPenLineIcon,
  CoinsIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  TargetIcon,
  WalletIcon,
} from "lucide-react";

export type NavigationGroupId = "primary" | "plan" | "insights" | "account";

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: NavigationGroupId;
  match: readonly string[];
};

export type NavigationGroup = {
  id: NavigationGroupId;
  label: string;
  items: readonly NavigationItem[];
};

export type RouteMetadata = {
  title: string;
  section: string;
  parentHref?: string;
  showBack?: boolean;
  mobileNavigation?: "visible" | "hidden" | "reduced";
};

export const navigationItems = [
  {
    href: "/",
    label: "Overview",
    icon: LayoutDashboardIcon,
    group: "primary",
    match: ["/"],
  },
  {
    href: "/transaction",
    label: "Transactions",
    icon: ArrowLeftRightIcon,
    group: "primary",
    match: ["/transaction", "/transaction/create"],
  },
  {
    href: "/accounts",
    label: "Accounts",
    icon: WalletIcon,
    group: "primary",
    match: ["/accounts", "/accounts/create"],
  },
  {
    href: "/budget",
    label: "Budgets",
    icon: ClipboardListIcon,
    group: "plan",
    match: ["/budget"],
  },
  {
    href: "/budget/setup",
    label: "Budget Setup",
    icon: ClipboardPenLineIcon,
    group: "plan",
    match: ["/budget/setup"],
  },
  {
    href: "/savings",
    label: "Savings Goals",
    icon: TargetIcon,
    group: "plan",
    match: ["/savings", "/savings/create"],
  },
  {
    href: "/loan",
    label: "Loans & Debt",
    icon: CoinsIcon,
    group: "plan",
    match: ["/loan", "/loan/create"],
  },
  {
    href: "/analytics",
    label: "Reports",
    icon: ChartNoAxesColumnIcon,
    group: "insights",
    match: ["/analytics"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
    group: "account",
    match: ["/settings"],
  },
] as const satisfies readonly NavigationItem[];

const navigationGroupLabels: Record<NavigationGroupId, string> = {
  primary: "Overview",
  plan: "Plan",
  insights: "Insights",
  account: "Account",
};

export const navigationGroups = (
  ["primary", "plan", "insights", "account"] as const
).map((id) => ({
  id,
  label: navigationGroupLabels[id],
  items: navigationItems.filter((item) => item.group === id),
})) satisfies NavigationGroup[];

export const routeMetadata: Record<string, RouteMetadata> = {
  "/": { title: "Overview", section: "Overview" },
  "/transaction": { title: "Transactions", section: "Transactions" },
  "/transaction/create": {
    title: "Add Transaction",
    section: "Transactions",
    parentHref: "/transaction",
    showBack: true,
    mobileNavigation: "hidden",
  },
  "/accounts": { title: "Accounts", section: "Accounts" },
  "/accounts/create": {
    title: "Add Account",
    section: "Accounts",
    parentHref: "/accounts",
    showBack: true,
    mobileNavigation: "hidden",
  },
  "/analytics": { title: "Reports", section: "Insights" },
  "/budget": { title: "Budgets", section: "Plan" },
  "/budget/setup": {
    title: "Budget Setup",
    section: "Plan",
    parentHref: "/budget",
    showBack: true,
    mobileNavigation: "reduced",
  },
  "/loan": { title: "Loans & Debt", section: "Plan" },
  "/loan/create": {
    title: "Add Loan or Debt",
    section: "Plan",
    parentHref: "/loan",
    showBack: true,
    mobileNavigation: "hidden",
  },
  "/profile": {
    title: "Profile",
    section: "Account",
    mobileNavigation: "reduced",
  },
  "/savings": { title: "Savings Goals", section: "Plan" },
  "/savings/create": {
    title: "Add Savings Goal",
    section: "Plan",
    parentHref: "/savings",
    showBack: true,
    mobileNavigation: "hidden",
  },
  "/settings": {
    title: "Settings",
    section: "Account",
    mobileNavigation: "reduced",
  },
};

export function getActiveNavigationItem(pathname: string): NavigationItem {
  return (
    navigationItems.find((item) => matchesNavigationItem(pathname, item)) ??
    navigationItems[0]
  );
}

export function matchesNavigationItem(
  pathname: string,
  item: NavigationItem,
): boolean {
  if (item.href === "/") {
    return pathname === "/";
  }

  return item.match.some((path) => {
    if (pathname === path) return true;
    if (path === "/budget") return false;
    return pathname.startsWith(`${path}/`);
  });
}

export function getRouteMetadata(pathname: string): RouteMetadata {
  const directMatch = routeMetadata[pathname];
  if (directMatch) return directMatch;

  if (pathname.startsWith("/transaction/")) {
    return {
      title: "Transaction Details",
      section: "Transactions",
      parentHref: "/transaction",
      showBack: true,
      mobileNavigation: "hidden",
    };
  }

  if (pathname.startsWith("/loan/")) {
    return {
      title: "Loan or Debt Details",
      section: "Plan",
      parentHref: "/loan",
      showBack: true,
      mobileNavigation: "hidden",
    };
  }

  if (pathname.startsWith("/savings/")) {
    return {
      title: "Savings Goal Details",
      section: "Plan",
      parentHref: "/savings",
      showBack: true,
      mobileNavigation: "hidden",
    };
  }

  if (pathname.startsWith("/accounts/")) {
    return {
      title: "Account Details",
      section: "Accounts",
      parentHref: "/accounts",
      showBack: true,
      mobileNavigation: "hidden",
    };
  }

  return routeMetadata["/"];
}

export function getMobileNavigationMode(
  pathname: string,
): NonNullable<RouteMetadata["mobileNavigation"]> {
  return getRouteMetadata(pathname).mobileNavigation ?? "visible";
}
