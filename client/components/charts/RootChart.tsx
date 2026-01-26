"use client";

import { Bar, BarChart, Cell, LabelList, XAxis } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Button } from "../ui/button";
import { Ellipsis } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useState } from "react";

const weekData = [
  { label: "Sun", amount: 280 },
  { label: "Mon", amount: 180 },
  { label: "Tue", amount: 664, highlight: true },
  { label: "Wed", amount: 275 },
  { label: "Thu", amount: 80 },
  { label: "Fri", amount: 312 },
  { label: "Sat", amount: 277 },
];
const monthData = [
  { label: "1", amount: 1200 },
  { label: "2", amount: 800 },
  { label: "5", amount: 900 },
  { label: "7", amount: 1500 },
  { label: "9", amount: 600 },
  { label: "10", amount: 1450, highlight: true },
  { label: "12", amount: 1100 },
  { label: "15", amount: 800 },
  { label: "20", amount: 1700 },
  { label: "22", amount: 1100 },
  { label: "25", amount: 1300 },
  { label: "27", amount: 900 },
  { label: "28", amount: 1400 },
  { label: "30", amount: 1600 },
];
const yearData = [
  { label: "Jan", amount: 4000 },
  { label: "Feb", amount: 3000 },
  { label: "Mar", amount: 4500, highlight: true },
  { label: "Apr", amount: 3500 },
  { label: "May", amount: 5000 },
  { label: "Jun", amount: 4200 },
  { label: "Jul", amount: 4800 },
  { label: "Aug", amount: 5300 },
  { label: "Sep", amount: 3900 },
  { label: "Oct", amount: 6000 },
  { label: "Nov", amount: 5800 },
  { label: "Dec", amount: 6200 },
];

const chartConfig = {
  data: {
    label: "amount",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig;

export function RootChart() {
  const [sortBy, setSortBy] = useState<"expense" | "income">("expense");
  const [showLimit, setShowLimit] = useState<"week" | "month" | "year">("week");

  return (
    <>
      <div className="flex items-center justify-between px-3 mb-1.5">
        <h4 className="font-bold capitalize">{sortBy}</h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setSortBy("expense")}>
              Expense
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("income")}>
              Income
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="bg-linear-to-t from-black to-accent rounded-3xl">
        <nav className="w-full flex flex-wrap justify-center pt-1.5">
          <Button
            onClick={() => setShowLimit("week")}
            type="button"
            variant="ghost"
            className={`w-fit rounded-none font-bold h-5 border-b-2 border-transparent transform-fill duration-300 ${
              showLimit === "week" ? "border-white" : "text-input"
            }`}
          >
            Week
          </Button>
          <Button
            onClick={() => setShowLimit("month")}
            type="button"
            variant="ghost"
            className={`w-fit rounded-none font-bold h-5 border-b-2 border-transparent transform-fill duration-300 ${
              showLimit === "month" ? "border-white" : "text-input"
            }`}
          >
            Month
          </Button>
          <Button
            onClick={() => setShowLimit("year")}
            type="button"
            variant="ghost"
            className={`w-fit rounded-none font-bold h-5 border-b-2 border-transparent transform-fill duration-300 ${
              showLimit === "year" ? "border-white" : "text-input"
            }`}
          >
            Year
          </Button>
        </nav>
        <>
          {showLimit === "week" && (
            <ChartContainer config={chartConfig}>
              <BarChart accessibilityLayer data={weekData}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <Bar dataKey="amount" radius={[9, 9, 0, 0]} barSize={60}>
                  <LabelList
                    dataKey="amount"
                    position="top"
                    formatter={(value: number) => `$${value}`}
                    className="fill-white text-xs font-bold"
                  />
                  {weekData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.highlight
                          ? "oklch(0.5847 0.2262 26.59)"
                          : "oklch(0.2178 0 129.63)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
          {showLimit === "month" && (
            <ChartContainer config={chartConfig}>
              <BarChart accessibilityLayer data={monthData}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <Bar dataKey="amount" radius={[9, 9, 0, 0]} barSize={60}>
                  <LabelList
                    dataKey="amount"
                    position="top"
                    formatter={(value: number) => `$${value}`}
                    className="fill-white text-xs font-bold"
                  />
                  {monthData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.highlight
                          ? "oklch(0.5847 0.2262 26.59)"
                          : "oklch(0.2178 0 129.63)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
          {showLimit === "year" && (
            <ChartContainer config={chartConfig}>
              <BarChart accessibilityLayer data={yearData}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <Bar dataKey="amount" radius={[9, 9, 0, 0]} barSize={60}>
                  <LabelList
                    dataKey="amount"
                    position="top"
                    formatter={(value: number) => `$${value}`}
                    className="fill-white text-xs font-bold"
                  />
                  {yearData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.highlight
                          ? "oklch(0.5847 0.2262 26.59)"
                          : "oklch(0.2178 0 129.63)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </>
      </div>
    </>
  );
}
