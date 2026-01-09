import Footer from "@/components/Footer";
import React, { Fragment } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Fragment>
      {children}
      <Footer />
    </Fragment>
  );
}
