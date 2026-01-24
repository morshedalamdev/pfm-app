import { CoinsIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";

export default function BudgetItem() {
  return (
    <div className="border border-input rounded-md p-3 space-y-3 text-xs">
      <div className="flex flex-wrap">
        <Button variant="secondary" size="icon">
          <CoinsIcon />
        </Button>
        <div className="flex-1 px-2">
          <h3 className="font-bold text-base line-clamp-1">Vacation Fund</h3>
          <p>
            40% <span className="text-red-500">Over budget</span>
          </p>
        </div>
        <div className="text-end">
          <h4 className="font-bold text-base">$250.00</h4>
          <h6 className="text-input">of $2000.00</h6>
        </div>
      </div>
      <div className="space-y-1">
        <Progress value={40} />
      </div>
    </div>
  );
}
