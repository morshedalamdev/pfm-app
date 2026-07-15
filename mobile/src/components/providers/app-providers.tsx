"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

type AppProvidersProps = Readonly<{
  children: ReactNode;
}>;

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      storageKey="pfm-mobile-theme"
    >
      {children}
    </ThemeProvider>
  );
}
