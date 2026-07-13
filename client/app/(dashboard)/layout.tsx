import Footer from "@/components/Footer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RecurringExpenseReminderProvider } from "@/components/recurring/RecurringExpenseReminderProvider";
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
      </RecurringExpenseReminderProvider>
    </AuthGuard>
  );
}
