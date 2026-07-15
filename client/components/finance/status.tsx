import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock3,
  MinusCircle,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { type FinanceTone, toneSoftClasses } from "./tokens";

export type FinanceStatus =
  | "active"
  | "archived"
  | "behind"
  | "completed"
  | "disabled"
  | "near_limit"
  | "neutral"
  | "on_track"
  | "over_budget"
  | "overdue"
  | "pending";

const statusConfig: Record<
  FinanceStatus,
  {
    icon: typeof Circle;
    label: string;
    tone: FinanceTone;
  }
> = {
  active: { icon: CheckCircle2, label: "Active", tone: "success" },
  archived: { icon: MinusCircle, label: "Archived", tone: "muted" },
  behind: { icon: Clock3, label: "Behind", tone: "warning" },
  completed: { icon: CheckCircle2, label: "Completed", tone: "success" },
  disabled: { icon: MinusCircle, label: "Disabled", tone: "muted" },
  near_limit: { icon: AlertTriangle, label: "Near limit", tone: "warning" },
  neutral: { icon: Circle, label: "Neutral", tone: "neutral" },
  on_track: { icon: CheckCircle2, label: "On track", tone: "success" },
  over_budget: { icon: XCircle, label: "Over budget", tone: "destructive" },
  overdue: { icon: AlertTriangle, label: "Overdue", tone: "destructive" },
  pending: { icon: Clock3, label: "Pending", tone: "info" },
};

export function StatusBadge({
  className,
  icon = true,
  label,
  status = "neutral",
  tone,
}: {
  className?: string;
  icon?: boolean;
  label?: string;
  status?: FinanceStatus;
  tone?: FinanceTone;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      data-slot="status-badge"
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        toneSoftClasses[tone ?? config.tone],
        className,
      )}
    >
      {icon ? <Icon aria-hidden="true" className="size-3.5 shrink-0" /> : null}
      <span className="truncate">{label ?? config.label}</span>
    </span>
  );
}
