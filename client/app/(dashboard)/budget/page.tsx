"use client";

import { Fragment, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { CheckIcon, ChevronDownIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import BudgetItem from "@/components/items/BudgetItem";

const MONTHS = [
  { value: "Jan-2026", label: "Jan 2026" },
  { value: "Feb-2025", label: "Feb 2025" },
  { value: "Mar-2025", label: "Mar 2025" },
  { value: "Apr-2025", label: "Apr 2025" },
  { value: "May-2025", label: "May 2025" },
  { value: "Jun-2025", label: "Jun 2025" },
  { value: "Jul-2025", label: "Jul 2025" },
  { value: "Aug-2025", label: "Aug 2025" },
  { value: "Sep-2025", label: "Sep 2025" },
  { value: "Oct-2025", label: "Oct 2025" },
  { value: "Nov-2025", label: "Nov 2025" },
  { value: "Dec-2025", label: "Dec 2025" },
  { value: "Jan-2024", label: "Jan 2024" },
  { value: "Feb-2024", label: "Feb 2024" },
  { value: "Mar-2024", label: "Mar 2024" },
  { value: "Apr-2024", label: "Apr 2024" },
  { value: "May-2024", label: "May 2024" },
  { value: "Jun-2024", label: "Jun 2024" },
  { value: "Jul-2024", label: "Jul 2024" },
  { value: "Aug-2024", label: "Aug 2024" },
  { value: "Sep-2024", label: "Sep 2024" },
  { value: "Oct-2024", label: "Oct 2024" },
  { value: "Nov-2024", label: "Nov 2024" },
  { value: "Dec-2024", label: "Dec 2024" },
];
export default function BudgetPage() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("Jan 2026");
  return (
    <Fragment>
      <Header homeBtn={true} title="Savings Goals">
        <Link href="/budget/setup">
          <Button variant="link" size="icon-sm">
            <SettingsIcon />
          </Button>
        </Link>
      </Header>
      <section className="p-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="justify-between"
            >
              {value}
              <ChevronDownIcon className="text-input" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            <Command>
              <CommandInput placeholder="Search Month" />
              <CommandGroup>
                {MONTHS.map((month) => (
                  <CommandItem
                    key={month.value}
                    value={month.value}
                    className="flex items-center justify-between"
                    onSelect={(currentValue) => {
                      setValue(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                  >
                    {month.label}
                    <CheckIcon
                      className={
                        value === month.value ? "opacity-100" : "opacity-0"
                      }
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </section>
      <section className="p-3 font-medium">
        <h2 className="text-input font-bold uppercase tracking-wide">
          Monthly Budget
        </h2>
        <h3 className="text-5xl font-bold">$2,483.39</h3>
        <div className="flex flex-wrap items-center justify-between gap-1.5 mt-3">
          <div>
            <span className="text-input">Spent</span>
            <h4 className="font-bold text-2xl">$2100.00</h4>
          </div>
          <div>
            <span className="text-input">Remaining</span>
            <h4 className="font-bold text-2xl">$1400.00</h4>
          </div>
          <Progress value={40} className="h-2" />
          <span>60% used</span>
          <span>15 days remaining</span>
        </div>
      </section>
      <section className="space-y-3 p-3 h-[calc(100%-320px)] overflow-y-auto">
          <BudgetItem />
          <BudgetItem />
          <BudgetItem />
          <BudgetItem />
          <BudgetItem />
          <BudgetItem />
          <BudgetItem />
          <BudgetItem />
          <BudgetItem />
          <BudgetItem />
          <BudgetItem />
          <BudgetItem />
          <BudgetItem />
      </section>
    </Fragment>
  );
}
