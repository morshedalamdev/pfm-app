import Footer from "@/components/Footer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import React, { Fragment } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      {children}
      <Footer />
    </AuthGuard>
  );
}
