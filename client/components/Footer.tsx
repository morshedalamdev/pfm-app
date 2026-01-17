"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import {
  ArrowLeftRight,
  ChartPie,
  CircleEllipsis,
  Home,
  Wallet,
} from "lucide-react";
import { usePathname } from "next/navigation";

const list = [
  { href: "/income", icon: <Wallet />, label: "Income" },
  { href: "/transaction", icon: <ArrowLeftRight />, label: "Transaction" },
  { href: "/", icon: <Home />, label: "Home" },
  { href: "/report", icon: <ChartPie />, label: "Report" },
  { href: "/profile", icon: <CircleEllipsis />, label: "Profile" },
];
const MAIN_ROUTES = ["/", "/income", "/transaction", "/report", "/profile"];

export default function Footer() {
  const pathname = usePathname();

  if (!MAIN_ROUTES.includes(pathname)) {
    return null;
  }
  return (
    <footer className="fixed bottom-0 left-0 w-full h-[70px] p-2 bg-linear-to-t from-black from-50% to-black/0 z-999">
      <nav className="w-full flex items-end justify-evenly flex-wrap">
        {list.map((i) => (
          <Link key={i.label} href={i.href}>
            <Button
              variant="link"
              size="icon"
              className={`${
                pathname === i.href
                  ? "p-5 text-white bg-icon"
                  : "text-stone-500"
              } x-animation`}
            >
              {i.icon}
            </Button>
          </Link>
        ))}
      </nav>
    </footer>
  );
}
