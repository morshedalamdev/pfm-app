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
import { Table, TableBody, TableCell, TableRow } from "../ui/table";

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
        <Table className="text-black capitalize">
          <TableBody>
            <TableRow>
              <TableCell colSpan={5}>
                <h3 className="flex items-center gap-2 font-bold text-base line-clamp-1">
                  {categoryIcon?.icon && (
                    <categoryIcon.icon className="size-4" />
                  )}
                  <span>{category}</span>
                </h3>
              </TableCell>
              <TableCell>
                <p className="font-bold text-2xl">${amount.toFixed(2)}</p>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={6}>{note}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Type:</TableCell>
              <TableCell colSpan={2}>{type}</TableCell>
              <TableCell className="font-bold">Recurring:</TableCell>
              <TableCell colSpan={2}>Daily</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Time:</TableCell>
              <TableCell colSpan={2}>{date}</TableCell>
              <TableCell className="font-bold">Date:</TableCell>
              <TableCell colSpan={2}>12/01/2026</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <DrawerFooter>
          <Link href="/transaction/edit">
            <Button variant="outline" className="text-black">
              Edit
            </Button>
          </Link>
          <Button variant="secondary">Delete</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
