import { Sparkles } from "lucide-react";

type InsightBannerProps = Readonly<{ message: string }>;

export function InsightBanner({ message }: InsightBannerProps) {
  return (
    <aside className="insight-banner" aria-label="Monthly cash flow insight">
      <span>
        <Sparkles aria-hidden="true" size={19} />
        {message}
      </span>
    </aside>
  );
}
