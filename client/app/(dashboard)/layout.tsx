import Footer from "@/components/Footer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RecurringIncomeAchievementPopup } from "@/components/recurring/RecurringIncomeAchievementPopup";
import { RecurringReminderProvider } from "@/components/recurring/RecurringReminderProvider";
import { RecurringExpenseWarningPopup } from "@/components/recurring/RecurringExpenseWarningPopup";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { AuthenticatedAppShell } from "@/components/shell/AuthenticatedAppShell";
import React from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loadingFallback = (
    <AuthenticatedAppShell>
      <section className="flex h-full items-center justify-center px-3 pb-9">
        <p className="text-sm text-input">Loading...</p>
      </section>
    </AuthenticatedAppShell>
  );

  return (
    <AuthGuard loadingFallback={loadingFallback}>
      <RecurringReminderProvider>
        <AuthenticatedAppShell
          mobileNavigation={<Footer />}
          sidebar={<AppSidebar />}
          topBar={<AppTopBar />}
        >
          {children}
        </AuthenticatedAppShell>
        <RecurringIncomeAchievementPopup />
        <RecurringExpenseWarningPopup />
      </RecurringReminderProvider>
    </AuthGuard>
  );
}
