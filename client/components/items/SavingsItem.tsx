import { Coins, SquarePen, Target } from "lucide-react";
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
import { FormEvent, useState } from "react";

type SavingsItemProps = {
  contributionError?: string | null;
  editHref: string;
  id: string;
  isContributing?: boolean;
  isDeleting?: boolean;
  monthlyTarget: string;
  name: string;
  note?: string | null;
  onAddContribution?: (amount: string, date: Date, note: string) => Promise<void>;
  onDelete?: () => void;
  percentComplete: number;
  savedAmount: string;
  targetAmount: string;
  targetDate: string;
};

export default function SavingsItem({
  contributionError,
  editHref,
  isContributing = false,
  isDeleting = false,
  monthlyTarget,
  name,
  note,
  onAddContribution,
  onDelete,
  percentComplete,
  savedAmount,
  targetAmount,
  targetDate,
}: SavingsItemProps) {
  const [amount, setAmount] = useState("");
  const [contributedAt, setContributedAt] = useState<Date | undefined>(
    new Date(),
  );
  const [contributionNote, setContributionNote] = useState("");

  async function handleContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onAddContribution || !contributedAt) return;
    await onAddContribution(amount, contributedAt, contributionNote);
    setAmount("");
    setContributionNote("");
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <div className="border border-input rounded-md p-3 space-y-3 text-xs">
          <div className="flex flex-wrap">
            <Button variant="secondary" size="icon"><Coins /></Button>
            <h3 className="flex-1 px-2 font-bold text-base line-clamp-1">
              {name}
            </h3>
            <div className="text-end">
              <h4 className="font-bold text-base">{savedAmount}</h4>
              <h6 className="text-input">of {targetAmount}</h6>
            </div>
          </div>
          <div className="space-y-1">
            <p>{Math.round(percentComplete)}% saved</p>
            <Progress value={Math.min(percentComplete, 100)} />
          </div>
          <div className="flex items-center justify-between text-input">
            <div className="flex items-center gap-1">
              <Target className="size-2.5" />
              {targetDate}
            </div>
            <p>Monthly: {monthlyTarget}</p>
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
              {name}
            </h3>
            <Link href={editHref}>
              <SquarePen className="size-4 text-secondary/80" />
            </Link>
          </div>
          <p className="text-secondary/80">{Math.round(percentComplete)}% saved</p>
          {note && <p className="text-secondary/80">{note}</p>}
          <div className="flex items-center justify-between my-2">
            <p className="font-bold text-3xl">{savedAmount}</p>
            <p>of {targetAmount}</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-secondary/80">
              <Target className="size-3" />
              {targetDate}
            </div>
            <p>Monthly: {monthlyTarget}</p>
          </div>
        </div>
        <DrawerFooter>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">Add Money</Button>
            </DrawerTrigger>
            <DrawerContent>
              <form onSubmit={handleContribution}>
                <DrawerHeader>
                  <DrawerTitle>Add Money to {name}</DrawerTitle>
                </DrawerHeader>
                <div className="p-2">
                  <FieldSet className="gap-2">
                    <Field className="max-w-xs mx-auto">
                      <Calendar
                        mode="single"
                        selected={contributedAt}
                        onSelect={setContributedAt}
                        className="w-full text-black"
                      />
                      <FieldError />
                    </Field>
                    <Field>
                      <InputGroup className="border-border">
                        <InputGroupInput
                          type="number"
                          min="0"
                          step="0.01"
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                          placeholder="$0.00"
                          required
                        />
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
                            value={contributionNote}
                            onChange={(event) =>
                              setContributionNote(event.target.value)
                            }
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
                      {isContributing ? "Adding..." : "Add Money"}
                    </Button>
                  </DrawerClose>
                  {contributionError && (
                    <p className="text-destructive text-sm text-center">
                      {contributionError}
                    </p>
                  )}
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
                Are you sure you want to delete this savings goal?
              </AlertDialogTitle>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
