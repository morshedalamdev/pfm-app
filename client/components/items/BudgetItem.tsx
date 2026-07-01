import { CoinsIcon, Trash2Icon } from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";

type BudgetItemProps = {
  category: string;
  limit: string;
  onDelete?: () => void;
  percentUsed: number;
  remaining: string;
  spent: string;
  status: "on_track" | "over_budget";
};

export default function BudgetItem({
  category,
  limit,
  onDelete,
  percentUsed,
  remaining,
  spent,
  status,
}: BudgetItemProps) {
  return (
    <div className="border border-input rounded-md p-3 space-y-3 text-xs">
      <div className="flex flex-wrap">
        <Button variant="secondary" size="icon">
          <CoinsIcon />
        </Button>
        <div className="flex-1 px-2">
          <h3 className="font-bold text-base line-clamp-1">{category}</h3>
          <p>
            {Math.round(percentUsed)}%{" "}
            <span
              className={status === "over_budget" ? "text-red-500" : "text-green-500"}
            >
              {status === "over_budget" ? "Over budget" : "On track"}
            </span>
          </p>
        </div>
        <div className="text-end">
          <h4 className="font-bold text-base">{spent}</h4>
          <h6 className="text-input">of {limit}</h6>
          <p className="text-input">{remaining} left</p>
        </div>
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            aria-label={`Delete ${category} budget`}
          >
            <Trash2Icon />
          </Button>
        )}
      </div>
      <div className="space-y-1">
        <Progress value={Math.min(percentUsed, 100)} />
      </div>
    </div>
  );
}
