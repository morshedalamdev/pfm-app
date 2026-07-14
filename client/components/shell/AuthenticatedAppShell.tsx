import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type AuthenticatedAppShellProps = {
  children: ReactNode;
  mobileNavigation?: ReactNode;
  sidebar?: ReactNode;
  topBar?: ReactNode;
};

export function AuthenticatedAppShell({
  children,
  mobileNavigation,
  sidebar,
  topBar,
}: AuthenticatedAppShellProps) {
  return (
    <div
      className="pfm-app-shell flex h-full min-h-svh w-full overflow-hidden bg-background text-foreground"
      data-shell="authenticated"
    >
      <aside
        aria-label="Primary navigation"
        className="hidden w-16 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:block lg:w-64"
        data-shell-region="sidebar"
      >
        {sidebar}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          aria-label="Application header"
          className="hidden h-16 shrink-0 border-b border-border bg-surface-overlay md:block"
          data-shell-region="top-bar"
        >
          {topBar}
        </header>
        <main
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
          data-shell-region="main"
        >
          <div
            className={cn(
              "mx-auto h-full min-h-full w-full max-w-md",
              mobileNavigation &&
                "pb-[calc(5.5rem+var(--pfm-shell-safe-bottom))] md:pb-0",
              "px-[var(--pfm-shell-safe-left)] pr-[var(--pfm-shell-safe-right)]",
            )}
            data-content-mode="legacy-constrained"
          >
            {children}
          </div>
        </main>
        <div className="md:hidden" data-shell-region="mobile-navigation">
          {mobileNavigation}
        </div>
      </div>
    </div>
  );
}
