import { Coins, HandCoins, Plus, SquarePen, Target, User } from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import {
  Drawer,
  DrawerClose,
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
import { Field, FieldError, FieldGroup, FieldSet } from "../ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from "../ui/input-group";
import { Calendar } from "../ui/calendar";

export default function SavingsItem({ type }: { type?: "lent" | "borrowed" }) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <div className="border border-input rounded-md p-3 space-y-3 text-xs">
          <div className="flex flex-wrap">
            <Button variant="secondary" size="icon">
              {type === "lent" ? <HandCoins /> : <Coins />}
            </Button>
            <h3 className="flex-1 px-2 font-bold text-base line-clamp-1">
              Vacation Fund
            </h3>
            <div className="text-end">
              <h4 className="font-bold text-base">$250.00</h4>
              <h6 className="text-input">of $2000.00</h6>
            </div>
          </div>
          <div className="space-y-1">
            <p>40% saved</p>
            <Progress value={40} />
          </div>
          <div className="flex items-center justify-between text-input">
            <div className="flex items-center gap-1">
              <Target className="size-2.5" />
              Dec 2026
            </div>
            <p>Monthly: $250.00</p>
          </div>
        </div>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Savings Details</DrawerTitle>
        </DrawerHeader>
        <div className="px-3">
          <div className="flex gap-1">
            <h3 className="flex-1 font-bold text-lg line-clamp-1 capitalize">
              Vacation Fund
            </h3>
            <Link href="/savings/edit">
              <SquarePen className="size-4 text-secondary/80" />
            </Link>
          </div>
          <p className="text-secondary/80">49% saved</p>
          <div className="flex items-center justify-between my-2">
            <p className="font-bold text-3xl">$250.00</p>
            <p>of $2000.00</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-secondary/80">
              <Target className="size-3" />
              Dec 2026
            </div>
            <p>Monthly: $250.00</p>
          </div>
        </div>
        <DrawerFooter>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">Add Money</Button>
            </DrawerTrigger>
            <DrawerContent>
              <form action="">
                <DrawerHeader>
                  <DrawerTitle>Add Money to Vacation Fund</DrawerTitle>
                </DrawerHeader>
                <div className="p-2">
                  <FieldSet className="gap-2">
                    <Field className="max-w-xs mx-auto">
                      <Calendar mode="single" className="w-full text-black" />
                      <FieldError />
                    </Field>
                    <Field>
                      <InputGroup className="border-border">
                        <InputGroupInput placeholder="$0.00" />
                        <InputGroupAddon className="text-primary-foreground">
                          Amount
                        </InputGroupAddon>
                      </InputGroup>
                      <FieldError />
                    </Field>
                    <FieldGroup>
                      <Field>
                        <InputGroup className="border-border">
                          <InputGroupTextarea
                            placeholder="Type here.."
                            className="pt-0"
                          />
                          <InputGroupAddon
                            align="block-start"
                            className="text-primary-foreground"
                          >
                            Note
                          </InputGroupAddon>
                        </InputGroup>
                        <FieldError />
                      </Field>
                    </FieldGroup>
                  </FieldSet>
                </div>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button type="submit" variant="reverse">
                      Add Money
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </form>
            </DrawerContent>
          </Drawer>
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
