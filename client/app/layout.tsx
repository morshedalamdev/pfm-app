import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PFM - Personal Finance Management App",
  description: "A personal finance app that helps users monitor income, expenses, and savings with insightful reports and analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${urbanist.variable} antialiased`}>
        <div className="flex flex-col flex-wrap max-w-md w-full mx-auto">{children}</div>
      </body>
    </html>
  );
}
