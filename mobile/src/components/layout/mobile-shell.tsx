import type { ReactNode } from "react";

import { BottomNavigation } from "@/components/navigation/bottom-navigation";

type MobileShellProps = Readonly<{
  children: ReactNode;
}>;

export function MobileShell({ children }: MobileShellProps) {
  return (
    <div className="mobile-frame" data-testid="mobile-app">
      <main className="mobile-content">{children}</main>
      <BottomNavigation />
    </div>
  );
}
