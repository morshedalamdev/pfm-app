"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import {
  ArrowLeftRightIcon,
  ChartNoAxesColumnIcon,
  CircleEllipsisIcon,
  ClipboardListIcon,
  ClipboardPenLineIcon,
  CoinsIcon,
  FileTextIcon,
  HomeIcon,
  InfoIcon,
  KeyRoundIcon,
  LockIcon,
  MessageCircleMoreIcon,
  SettingsIcon,
  SquarePenIcon,
  TargetIcon,
  Trash2Icon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Skeleton } from "./ui/skeleton";

const LIST = [
  { href: "/analytics", icon: <ChartNoAxesColumnIcon />, label: "Income" },
  { href: "/transaction", icon: <ArrowLeftRightIcon />, label: "Transaction" },
  { href: "/", icon: <HomeIcon />, label: "Home" },
  { href: "/loan", icon: <CoinsIcon />, label: "Loan" },
];
const MAIN_ROUTES = ["/", "/analytics", "/transaction", "/loan"];

export default function Footer() {
  const pathname = usePathname();

  if (!MAIN_ROUTES.includes(pathname)) {
    return null;
  }
  return (
    <footer className="fixed bottom-0 left-0 w-full h-[70px] p-2 bg-linear-to-t from-black from-50% to-black/0 z-999">
      <nav className="w-full flex items-end justify-evenly flex-wrap">
        {LIST.map((i) => (
          <Link key={i.label} href={i.href}>
            <Button
              variant="link"
              size="icon"
              className={`${
                pathname === i.href ? "p-5 text-white bg-icon" : "text-input"
              } x-animation`}
            >
              {i.icon}
            </Button>
          </Link>
        ))}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="link" size="icon" className="text-input">
              <CircleEllipsisIcon />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle></SheetTitle>
            <div>
              <div className="p-5">
                <Skeleton className="size-15 rounded-full" />
                <div className="flex items-center gap-3 mt-3">
                  <h2 className="font-bold text-xl">Chief Dodson</h2>
                  <Link href="/profile">
                    <Button variant="ghost" size="icon-sm">
                      <SquarePenIcon className="size-3" />
                    </Button>
                  </Link>
                </div>
                <p className="text-input">test@example.com</p>
              </div>
              <div className="flex flex-col h-[calc(100vh-197px)] bg-linear-to-t from-accent/50 to-secondary rounded-t-3xl px-5 py-3">
                <p className="text-xs font-black tracking-wide text-input uppercase">
                  Board
                </p>
                <Link href="/savings">
                  <Button
                    variant="ghost"
                    className="border-b border-input/50 rounded-none justify-start gap-2 px-0!"
                  >
                    <TargetIcon />
                    Savings Goals
                  </Button>
                </Link>
                <Link href="/budget">
                  <Button
                    variant="ghost"
                    className="border-b border-input/50 rounded-none justify-start gap-2 px-0!"
                  >
                    <ClipboardListIcon />
                    Budget Planning
                  </Button>
                </Link>
                <Link href="/budget/setup">
                  <Button
                    variant="ghost"
                    className="border-b border-input/50 rounded-none justify-start gap-2 px-0!"
                  >
                    <ClipboardPenLineIcon />
                    Budget Setup
                  </Button>
                </Link>
                <p className="text-xs font-black tracking-wide text-input uppercase mt-5">
                  customer support
                </p>
                <Button
                  variant="ghost"
                  className="border-b border-input/50 rounded-none justify-start gap-2 px-0!"
                >
                  <InfoIcon />
                  What is Infiny PFM
                </Button>
                <Button
                  variant="ghost"
                  className="border-b border-input/50 rounded-none justify-start gap-2 px-0!"
                >
                  <LockIcon />
                  Privacy Notice
                </Button>
                <Button
                  variant="ghost"
                  className="border-b border-input/50 rounded-none justify-start gap-2 px-0!"
                >
                  <FileTextIcon />
                  User Agreement
                </Button>
                <Button
                  variant="ghost"
                  className="border-b border-input/50 rounded-none justify-start gap-2 px-0!"
                >
                  <MessageCircleMoreIcon />
                  Contact Us
                </Button>
                <p className="text-xs font-black tracking-wide text-input uppercase mt-5">
                  preferences
                </p>
                <Button
                  variant="ghost"
                  className="border-b border-input/50 rounded-none justify-start gap-2 px-0!"
                >
                  <SettingsIcon />
                  Settings
                </Button>
                <Link href="/auth/forgot-password">
                  <Button
                    variant="ghost"
                    className="border-b border-input/50 rounded-none justify-start gap-2 px-0!"
                  >
                    <KeyRoundIcon />
                    Reset Password
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="rounded-none justify-start gap-2 px-0!"
                >
                  <Trash2Icon />
                  Delete Account
                </Button>
                <Button variant="destructive" className="mt-auto">
                  Logout
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </footer>
  );
}
