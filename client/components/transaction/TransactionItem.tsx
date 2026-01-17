import { categoryIcons } from "@/lib/categoryIcons";
import { CarFront, Clock } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Button } from "../ui/button";
import Link from "next/link";

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
    <Drawer>
      <DrawerTrigger asChild>
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
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Transaction Details</DrawerTitle>
        </DrawerHeader>
        <div className="text-black px-2 space-y-1.5">
          <h3 className="flex items-center gap-3 font-bold text-base line-clamp-1">
            {categoryIcon?.icon && <categoryIcon.icon className="size-4" />}
            <span>{category}</span>
          </h3>
          <p>{note}</p>
          <div className="grid grid-cols-2 items-end gap-2">
            <p>
              <b>Type:</b> {type}
            </p>
            <p className="font-bold text-xl">${amount.toFixed(2)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <p>
              <b>Time:</b> {date}
            </p>
            <p>
              <b>Date:</b> {date}
            </p>
          </div>
        </div>
        <DrawerFooter>
          <Link href="/transaction/edit">
            <Button variant="outline" className="text-black">
              Edit Transaction
            </Button>
          </Link>
          <DrawerClose asChild>
            <Button variant="secondary">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
