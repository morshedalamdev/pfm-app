"use client";

import { Bar, BarChart, Cell, LabelList, XAxis } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Button } from "./ui/button";
import { Ellipsis } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useState } from "react";

const chartData = [
  { day: "Sun", expenses: 280 },
  { day: "Mon", expenses: 180 },
  { day: "Tue", expenses: 664, highlight: true },
  { day: "Wed", expenses: 275 },
  { day: "Thu", expenses: 80 },
  { day: "Fri", expenses: 312 },
  { day: "Sat", expenses: 277 },
];

const chartConfig = {
  expenses: {
    label: "Expenses",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig;

export function RootChart() {
  const [sortBy, setSortBy] = useState<"expense" | "income">("expense");
  const [showLimit, setShowLimit] = useState<"day" | "week" | "month" | "year">(
    "week"
  );

  return (
    <>
      <div className="flex items-center justify-between px-2 mb-1">
        <h2 className="font-bold capitalize">{sortBy}</h2>
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
        <nav className="w-full flex flex-wrap justify-center pt-2">
          <Button
            onClick={() => setShowLimit("day")}
            type="button"
            variant="ghost"
            className={`w-fit rounded-none font-bold h-5 border-b-2 border-transparent transform-fill duration-300 ${
              showLimit === "day" ? "border-white" : "text-input"
            }`}
          >
            Today
          </Button>
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
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <Bar dataKey="expenses" radius={[9, 9, 0, 0]} barSize={60}>
              <LabelList
                dataKey="expenses"
                position="top"
                formatter={(value: number) => `$${value}`}
                className="fill-white text-xs font-bold"
              />
              {chartData.map((entry, index) => (
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
      </div>
    </>
  );
}
