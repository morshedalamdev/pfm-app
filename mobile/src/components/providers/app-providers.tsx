"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { SessionHydrator } from "@/components/auth/session-hydrator";

type AppProvidersProps = Readonly<{
  children: ReactNode;
}>;

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } }),
  );

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      storageKey="pfm-mobile-theme"
    >
      <QueryClientProvider client={queryClient}>
        <SessionHydrator />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
