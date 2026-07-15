import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type PageHeaderProps = Readonly<{
  title: string;
  trailing?: ReactNode;
}>;

export function PageHeader({ title, trailing }: PageHeaderProps) {
  return (
    <header className="page-header">
      <Link aria-label="Back to home" className="icon-button icon-button--plain" href="/">
        <ArrowLeft aria-hidden="true" size={22} />
      </Link>
      <h1>{title}</h1>
      <div className="page-header-trailing">{trailing}</div>
    </header>
  );
}
