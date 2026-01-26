"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  CalendarDaysIcon,
  ChartNoAxesGanttIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  CoinsIcon,
  TargetIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import HeaderItem from "@/components/items/HeaderItem";
import { Progress } from "@/components/ui/progress";
import IncomeVsExpenseChart from "@/components/charts/IncomeVsExpenseChart";
import SpendingChart from "@/components/charts/SpendingChart";

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
export default function AnalyticsPage() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("Jan 2026");

  return (
    <Fragment>
      <Header title="Analytics">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              role="combobox"
              aria-expanded={open}
              className="w-25 justify-between"
            >
              {value}
              <ChevronDownIcon className="text-input" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-30 p-0">
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
      </Header>
      <div className="h-[calc(100%-44px)] pb-[70px] overflow-y-auto">
        <section className="mt-6 px-3">
          <h2 className="text-input font-bold uppercase tracking-wide">
            Savings
          </h2>
          <h3 className="text-5xl font-bold">$2,483.39</h3>
          <h4 className="font-medium mt-1.5">
            <span className="text-green-400">+15%</span> from last month
          </h4>
        </section>
        <section className="grid grid-cols-2 gap-3 p-3 pb-0">
          <HeaderItem title="Income" amount="$5,200" />
          <HeaderItem title="Expenses" amount="$2,716" />
        </section>
        <section className="grid grid-cols-2 gap-3 p-3">
          <Link href="/savings">
            <div className="rounded-md p-3 flex flex-col border border-input">
              <div className="flex justify-between items-center mb-1.5">
                <TargetIcon />
                <ChevronRightIcon />
              </div>
              <h2 className="font-bold text-base">Savings Goals</h2>
              <p className="text-xs">5 active goals</p>
            </div>
          </Link>
          <Link href="/budget">
            <div className="rounded-md p-3 flex flex-col border border-input">
              <div className="flex justify-between items-center mb-1.5">
                <ClipboardListIcon />
                <ChevronRightIcon />
              </div>
              <h2 className="font-bold text-base">Budget Planning</h2>
              <p className="text-xs">60% used</p>
            </div>
          </Link>
        </section>
        <section className="p-3 space-y-1.5">
          <h2 className="font-bold text-lg">Income vs Expense</h2>
          <IncomeVsExpenseChart />
        </section>
        <section className="p-3 space-y-1.5">
          <h2 className="font-bold text-lg">Spending by Category</h2>
          <SpendingChart />
        </section>
        <section className="p-3 space-y-1.5">
          <h2 className="font-bold text-lg">Top Expenses</h2>
          <ul className="space-y-3">
            <li className="border border-input rounded-md p-1.5">
              <div className="flex flex-wrap gap-1.5">
                <Button variant="secondary" size="icon">
                  <CoinsIcon />
                </Button>
                <div className="flex-1 flex flex-col gap-0.5">
                  <div className="flex justify-between gap-3">
                    <h3 className="flex-1 font-bold text-base line-clamp-1">
                      Mike Johnson
                    </h3>
                    <h4 className="font-bold text-base">$250.00</h4>
                  </div>
                  <div className="flex flex-wrap justify-between text-input gap-0.5">
                    <p>40% of budget</p>
                    <h6>Budget: $2000.00</h6>
                    <Progress value={40} />
                  </div>
                </div>
              </div>
            </li>
            <li className="border border-input rounded-md p-1.5">
              <div className="flex flex-wrap gap-1.5">
                <Button variant="secondary" size="icon">
                  <CoinsIcon />
                </Button>
                <div className="flex-1 flex flex-col gap-0.5">
                  <div className="flex justify-between gap-3">
                    <h3 className="flex-1 font-bold text-base line-clamp-1">
                      Mike Johnson
                    </h3>
                    <h4 className="font-bold text-base">$250.00</h4>
                  </div>
                  <div className="flex flex-wrap justify-between text-input gap-0.5">
                    <p>40% of budget</p>
                    <h6>Budget: $2000.00</h6>
                    <Progress value={40} />
                  </div>
                </div>
              </div>
            </li>
            <li className="border border-input rounded-md p-1.5">
              <div className="flex flex-wrap gap-1.5">
                <Button variant="secondary" size="icon">
                  <CoinsIcon />
                </Button>
                <div className="flex-1 flex flex-col gap-0.5">
                  <div className="flex justify-between gap-3">
                    <h3 className="flex-1 font-bold text-base line-clamp-1">
                      Mike Johnson
                    </h3>
                    <h4 className="font-bold text-base">$250.00</h4>
                  </div>
                  <div className="flex flex-wrap justify-between text-input gap-0.5">
                    <p>40% of budget</p>
                    <h6>Budget: $2000.00</h6>
                    <Progress value={40} />
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </section>
        <section className="p-3 space-y-1.5">
          <h2 className="font-bold text-lg">Monthly Trends</h2>
          <ul className="space-y-3">
            <li className="border border-input rounded-md p-1.5">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1">
                  <h3 className="text-input">Average Daily Spending</h3>
                  <h4 className="font-bold text-base">$250.00</h4>
                </div>
                <ChartNoAxesGanttIcon />
              </div>
            </li>
            <li className="border border-input rounded-md p-1.5">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1">
                  <h3 className="text-input">Most Expensive Day</h3>
                  <h4 className="font-bold text-base">Jan 15 - $250.00</h4>
                </div>
                <CalendarDaysIcon />
              </div>
            </li>
            <li className="border border-input rounded-md p-3">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1">
                  <h3 className="text-input mb-1.5">Budget Adherence</h3>
                  <Progress value={40} />
                </div>
                <h4 className="font-bold text-lg">75%</h4>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </Fragment>
  );
}
