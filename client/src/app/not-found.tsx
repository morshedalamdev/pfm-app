import { PageState } from "@/components/layout/page-state";

export default function NotFoundPage() {
  return (
    <div className="mobile-frame">
      <PageState
        actionHref="/"
        actionLabel="Return home"
        description="The page you requested does not exist or has moved."
        title="Page not found"
        variant="empty"
      />
    </div>
  );
}
