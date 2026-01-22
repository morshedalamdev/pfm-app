import { Calendar, Coins, HandCoins } from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
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

export default function LoanItem({ type }: { type?: "lent" | "borrowed" }) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <div className="border border-input rounded-md p-3 space-y-3 text-xs">
          <div className="flex flex-wrap">
            <Button variant="secondary" size="icon">
              {type === "lent" ? <HandCoins /> : <Coins />}
            </Button>
            <div className="flex-1 px-2">
              <h3 className="font-bold text-base line-clamp-1">Mike Johnson</h3>
              <h5 className="text-input line-clamp-1">
                {type === "lent" ? "Owns you" : "You owe"}
              </h5>
            </div>
            <div className="text-end">
              <h4 className="font-bold text-base">$250.00</h4>
              <h6 className="text-input">of $2000.00</h6>
            </div>
          </div>
          <div className="space-y-1">
            <p>40% repaid</p>
            <Progress value={40} />
          </div>
          <div className="flex items-center justify-between text-input">
            <div className="flex items-center gap-1">
              <Calendar className="size-2.5" />
              Jan 15
            </div>
            <p>Due: Feb 15</p>
          </div>
        </div>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {type === "lent" ? "Lent" : "Borrowed"} Details
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-3">
          <div className="flex gap-1">
            <h3 className="flex-1 font-bold text-lg line-clamp-1 capitalize">
              John Doe
            </h3>
            <span className="text-secondary/80">Feb 15</span>
          </div>
          <p>Owns you</p>
          <div className="flex items-center justify-between my-2">
            <p className="font-bold text-3xl">$250.00</p>
            <p>of $2000.00</p>
          </div>
          <div className="flex items-center gap-1 text-secondary/80">
            <Calendar className="size-2.5" />
            Jan 15
          </div>
        </div>
        <DrawerFooter>
          <Link href="/loan/edit">
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
