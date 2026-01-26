import Link from "next/link";
import { Home } from "lucide-react";

type HeaderProps = {
  title: string;
  children?: React.ReactNode;
  homeBtn?: boolean;
};

export default function Header({
  title,
  children,
  homeBtn = false,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between flex-wrap py-1.5 p-3">
      {homeBtn && (
        <Link href="/">
          <Home className="size-4" />
        </Link>
      )}
      <h2 className="font-bold tracking-wide text-lg">{title}</h2>
      {children}
    </header>
  );
}
