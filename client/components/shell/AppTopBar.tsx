"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BellIcon,
  ChevronLeftIcon,
  CircleUserRoundIcon,
  FileTextIcon,
  InfoIcon,
  KeyRoundIcon,
  LockIcon,
  LogOutIcon,
  MessageCircleMoreIcon,
  SettingsIcon,
  SquarePenIcon,
  Trash2Icon,
} from "lucide-react";

import type { components } from "@/generated/api-types";
import { apiGet } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";
import { getRouteMetadata } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationUnreadCountResponse =
  components["schemas"]["NotificationUnreadCountResponse"];

const supportActions = [
  { label: "What is Infiny PFM", icon: InfoIcon },
  { label: "Privacy Notice", icon: LockIcon },
  { label: "User Agreement", icon: FileTextIcon },
  { label: "Contact Us", icon: MessageCircleMoreIcon },
] as const;

export function AppTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const metadata = getRouteMetadata(pathname);
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const displayName = user?.full_name ?? user?.email?.split("@")[0] ?? "Profile";
  const displayEmail = user?.email ?? "Not signed in";

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

  return (
    <div className="flex h-full w-full items-center justify-between gap-4 px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {metadata.showBack && metadata.parentHref ? (
          <Button asChild variant="ghost" size="icon" className="w-8 shrink-0">
            <Link href={metadata.parentHref} aria-label={`Back to ${metadata.section}`}>
              <ChevronLeftIcon aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-muted-foreground">
            {metadata.section}
          </p>
          <h1 className="truncate text-lg font-bold text-foreground">
            {metadata.title}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative w-8"
          aria-label={
            unreadCount
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
        >
          <BellIcon aria-hidden="true" />
          {unreadCount ? (
            <span className="absolute right-0 top-0 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-9 w-auto max-w-52 gap-2 px-2"
              aria-label="Open account menu"
            >
              <CircleUserRoundIcon className="size-5" aria-hidden="true" />
              <span className="hidden max-w-32 truncate text-sm font-semibold lg:inline">
                {displayName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <span className="block truncate text-sm">{displayName}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {displayEmail}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <SquarePenIcon aria-hidden="true" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <SettingsIcon aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/auth/forgot-password">
                <KeyRoundIcon aria-hidden="true" />
                Reset Password
              </Link>
            </DropdownMenuItem>
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
      </div>
    </div>
  );
}
