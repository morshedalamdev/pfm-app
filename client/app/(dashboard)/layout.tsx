import Footer from "@/components/Footer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RecurringIncomeAchievementPopup } from "@/components/recurring/RecurringIncomeAchievementPopup";
import { RecurringReminderProvider } from "@/components/recurring/RecurringReminderProvider";
import { RecurringExpenseWarningPopup } from "@/components/recurring/RecurringExpenseWarningPopup";
import React, { Fragment } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <RecurringReminderProvider>
        {children}
        <Footer />
        <RecurringIncomeAchievementPopup />
        <RecurringExpenseWarningPopup />
      </RecurringReminderProvider>
    </AuthGuard>
  );
}
