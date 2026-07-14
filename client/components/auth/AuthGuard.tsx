"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStore } from "@/lib/auth/store";

export function AuthGuard({
  children,
  loadingFallback,
}: {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrate = useAuthStore((state) => state.hydrate);
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, status]);

  if (status === "idle" || status === "loading") {
    return loadingFallback ?? (
      <section className="flex h-full items-center justify-center px-3 pb-9">
        <p className="text-sm text-input">Loading...</p>
      </section>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return children;
}
