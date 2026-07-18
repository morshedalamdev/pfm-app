import { CircleAlert, Inbox, LoaderCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

type PageStateProps = Readonly<{
  actionHref?: Route;
  actionLabel?: string;
  description: string;
  title: string;
  variant: "empty" | "error" | "loading";
}>;

export function PageState({
  actionHref,
  actionLabel,
  description,
  title,
  variant,
}: PageStateProps) {
  const Icon =
    variant === "loading"
      ? LoaderCircle
      : variant === "error"
        ? CircleAlert
        : Inbox;

  return (
    <section
      aria-busy={variant === "loading" ? "true" : undefined}
      className={`page-state page-state--${variant}`}
      role={variant === "error" ? "alert" : "status"}
    >
      <span className="page-state-icon">
        <Icon aria-hidden="true" size={23} />
      </span>
      <h1>{title}</h1>
      <p>{description}</p>
      {actionHref && actionLabel ? (
        <Link className="page-state-action" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
