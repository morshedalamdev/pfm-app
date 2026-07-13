import Footer from "@/components/Footer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RecurringExpenseReminderProvider } from "@/components/recurring/RecurringExpenseReminderProvider";
import { RecurringExpenseWarningPopup } from "@/components/recurring/RecurringExpenseWarningPopup";
import React, { Fragment } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <RecurringExpenseReminderProvider>
        {children}
        <Footer />
        <RecurringExpenseWarningPopup />
      </RecurringExpenseReminderProvider>
    </AuthGuard>
  );
}
