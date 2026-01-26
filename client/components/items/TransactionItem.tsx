import { categoryIcons } from "@/lib/categoryIcons";
import { Clock } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Button } from "../ui/button";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";

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
          <Button variant="secondary" size="icon">
            {categoryIcon?.icon && <categoryIcon.icon />}
          </Button>
          <div className="flex-1 px-1.5">
            <h3 className="font-bold text-base line-clamp-1">{category}</h3>
            <h5 className="text-input text-xs line-clamp-1">{note}</h5>
          </div>
          <div>
            <h4
              className={
                type === "income"
                  ? "font-bold text-green-500 text-base"
                  : type === "transfer"
                  ? "font-bold text-blue-500 text-base"
                  : "font-bold text-base"
              }
            >
              ${amount.toFixed(2)}
            </h4>
            <h6 className="flex items-center justify-end gap-1 text-input text-xs">
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
        <div className="grid grid-cols-2 gap-3 capitalize px-3">
          <div className="flex flex-col">
            <h3 className="col-span-2 font-bold text-lg line-clamp-1">
              {category}
            </h3>
            <p>{note}</p>
          </div>
          <p className="col-span-2 font-bold text-3xl">${amount.toFixed(2)}</p>
          <p>
            <b>Type:</b> {type}
          </p>
          <p>
            <b>Recurring:</b> Daily
          </p>
          <p>
            <b>Time:</b> {date}
          </p>
          <p>
            <b>Date:</b> 12/01/2026
          </p>
        </div>
        <DrawerFooter>
          <Link href="/transaction/edit">
            <Button variant="outline">Edit</Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="reverse">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>
                Are you sure you want to delete this transaction?
              </AlertDialogTitle>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
