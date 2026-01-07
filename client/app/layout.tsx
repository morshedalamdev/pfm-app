import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import ellipseImg from "@/assets/ellipse.svg"

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
    <html lang="en" className="overflow-x-hidden">
      <body className={`${urbanist.variable} antialiased overflow-x-hidden`}>
        <div className="absolute -top-60 w-full z-0"><Image src={ellipseImg} alt="ellipse for background" width={240} height={240} className="scale-200 w-full" /></div>
        <div className="relative h-svh mx-auto z-10">{children}</div>
      </body>
    </html>
  );
}