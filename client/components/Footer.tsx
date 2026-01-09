import Link from "next/link";
import { Button } from "./ui/button";
import {
  ArrowLeftRight,
  ChartPie,
  CircleEllipsis,
  Home,
  Wallet,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 w-full p-2 z-999">
      <nav className="flex items-center justify-evenly flex-wrap">
        <Link href="/">
          <Button variant="link" size="icon" className="text-stone-300">
            <Wallet />
          </Button>
        </Link>
        <Link href="/">
          <Button variant="link" size="icon" className="text-stone-300">
            <ArrowLeftRight />
          </Button>
        </Link>
        <Link href="/">
          <Button
            variant="link"
            size="icon"
            className="p-5 text-white x-icon-bg"
          >
            <Home />
          </Button>
        </Link>
        <Link href="/">
          <Button variant="link" size="icon" className="text-stone-300">
            <ChartPie />
          </Button>
        </Link>
        <Link href="/">
          <Button variant="link" size="icon" className="text-stone-300">
            <CircleEllipsis />
          </Button>
        </Link>
      </nav>
    </footer>
  );
}
