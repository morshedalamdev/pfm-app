import { ChevronRight, Sparkles } from "lucide-react";

export function InsightBanner() {
  return (
    <button className="insight-banner" type="button">
      <span>
        <Sparkles aria-hidden="true" size={19} />
        Your insight is ready
      </span>
      <span className="insight-action">
        View <ChevronRight aria-hidden="true" size={17} />
      </span>
    </button>
  );
}
