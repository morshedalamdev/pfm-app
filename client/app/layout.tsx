import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Script from "next/script";
import ellipseImg from "@/assets/ellipse.svg";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PFM - Personal Finance Management App",
  description: "A personal finance app that helps users monitor income, expenses, and savings with insightful reports and analytics.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className={`${urbanist.variable} antialiased overflow-x-hidden`} suppressHydrationWarning>
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
        <div className="absolute -top-60 left-0 w-full overflow-hidden z-0">
          <Image
            src={ellipseImg}
            alt="ellipse for background"
            width={240}
            height={240}
            className="w-full scale-200"
          />
        </div>
        <main className="relative h-svh mx-auto z-10">{children}</main>
      </body>
    </html>
  );
}
