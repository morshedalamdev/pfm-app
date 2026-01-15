import { ChevronLeft } from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";

type HeaderProps = {
  title: string;
  children: React.ReactNode;
};

export default function Header({ title, children }: HeaderProps) {
  return (
    <header className="sticky top-0 w-full p-2 z-999">
      <div className="flex items-center justify-between flex-wrap">
        <Link href="/">
          <Button variant="link" size="icon" className="x-icon-bg">
            <ChevronLeft />
          </Button>
        </Link>
        <h2 className="font-bold tracking-wide text-lg">{title}</h2>
        <Button variant="link" size="icon" className="x-icon-bg">{children}</Button>
      </div>
    </header>
  );
}
