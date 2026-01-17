import { categoryIcons } from "@/lib/categoryIcons";
import { CarFront, Clock } from "lucide-react";

type TransactionItemProps = {
  type: string;
  category: string;
  note: string;
  amount: number;
  date: string;
};

export default function TransactionItem({
  type,
  category,
  note,
  amount,
  date,
}: TransactionItemProps) {
  const categoryIcon = categoryIcons.find((i) => i.name === category);

  return (
    <div className="flex flex-wrap">
      <div className="size-8 flex items-center justify-center rounded-lg x-icon-bg">
        {categoryIcon?.icon && <categoryIcon.icon />}
      </div>
      <div className="flex-1 px-2">
        <h3 className="font-bold text-base line-clamp-1">{category}</h3>
        <h5 className="text-stone-400 text-xs line-clamp-1">{note}</h5>
      </div>
      <div>
        <h4
          className={
            type === "income"
              ? "font-bold text-green-500"
              : type === "transfer"
              ? "font-bold text-blue-500"
              : "font-bold"
          }
        >
          ${amount.toFixed(2)}
        </h4>
        <h6 className="flex items-center justify-end gap-1 text-stone-400 text-xs">
          <Clock className="size-2.5" />
          <span>{date}</span>
        </h6>
      </div>
    </div>
  );
}
