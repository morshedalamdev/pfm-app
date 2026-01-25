import Link from "next/link";
import { Home } from "lucide-react";

type HeaderProps = {
  title: string;
  children?: React.ReactNode;
  homeBtn?: boolean;
};

export default function Header({ title, children, homeBtn = false }: HeaderProps) {
  return (
    <header className="sticky top-0 flex items-center justify-between flex-wrap p-3">
      <div className="flex items-center gap-2">
        {homeBtn && <Link href="/" ><Home className="size-4" /></Link>}
        <h2 className="font-bold tracking-wide text-lg">{title}</h2>
      </div>
      {children}
    </header>
  );
}
