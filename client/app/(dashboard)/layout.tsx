import Footer from "@/components/Footer";
import Header from "@/components/Header";
import React, { Fragment } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Fragment>
      <Header />
      <main className="flex-1 w-full">{children}</main>
      <Footer />
    </Fragment>
  );
}
