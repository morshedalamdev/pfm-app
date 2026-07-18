import { MoreVertical, Target } from "lucide-react";

import { ProgressBar } from "@/components/ui/progress-bar";

export function PlanCard() {
  return (
    <article className="goal-card">
      <div className="goal-title-row">
        <span className="category-icon accent-coral">
          <Target aria-hidden="true" size={20} />
        </span>
        <div>
          <strong>House by the Sea</strong>
          <span>Target · October 2027</span>
        </div>
        <button aria-label="Goal options" className="icon-button icon-button--plain" type="button">
          <MoreVertical aria-hidden="true" size={19} />
        </button>
      </div>
      <p className="goal-amount"><strong>$8,750.00</strong> of $12,500.00</p>
      <ProgressBar accent="coral" label="House by the Sea progress" value={70} />
      <div className="goal-progress-copy"><span>Your progress</span><strong>$3,750 left</strong></div>
      <p className="goal-alert">You’re 10% behind schedule and off target.</p>
    </article>
  );
}
