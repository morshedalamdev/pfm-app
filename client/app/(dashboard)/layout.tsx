import React, { Fragment } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Fragment>
      <header className="w-full"></header>
      <main className="flex-1 w-full">{children}</main>
      <footer className="w-full"></footer>
    </Fragment>
  );
}
