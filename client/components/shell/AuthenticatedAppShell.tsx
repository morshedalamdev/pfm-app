import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type AuthenticatedAppShellProps = {
  children: ReactNode;
  mobileNavigation?: ReactNode;
};

export function AuthenticatedAppShell({
  children,
  mobileNavigation,
}: AuthenticatedAppShellProps) {
  return (
    <div
      className="pfm-app-shell flex h-full min-h-svh w-full overflow-hidden bg-background text-foreground"
      data-shell="authenticated"
    >
      <aside
        aria-label="Primary navigation"
        className="hidden shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block lg:w-0"
        data-shell-region="sidebar"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          aria-label="Application header"
          className="hidden shrink-0 border-b border-border bg-surface-overlay"
          data-shell-region="top-bar"
        />
        <main
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
          data-shell-region="main"
        >
          <div
            className={cn(
              "mx-auto h-full min-h-full w-full max-w-md",
              "px-[var(--pfm-shell-safe-left)] pr-[var(--pfm-shell-safe-right)]",
            )}
            data-content-mode="legacy-constrained"
          >
            {children}
          </div>
        </main>
        <div data-shell-region="mobile-navigation">{mobileNavigation}</div>
      </div>
    </div>
  );
}
