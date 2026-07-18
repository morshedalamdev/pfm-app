import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { HeaderMenu } from "@/components/navigation/header-menu";

type PageHeaderProps = Readonly<{
  backHref?: Route | null;
  title: string;
  trailing?: ReactNode;
}>;

export function PageHeader({ backHref = "/", title, trailing }: PageHeaderProps) {
  return (
    <header className="page-header">
      {backHref ? (
        <Link aria-label="Go back" className="icon-button icon-button--plain" href={backHref}>
          <ArrowLeft aria-hidden="true" size={22} />
        </Link>
      ) : null}
      <h1>{title}</h1>
      <div className="page-header-trailing">{trailing}<HeaderMenu /></div>
    </header>
  );
}
