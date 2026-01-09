"use client";

import { Bar, BarChart, Cell, LabelList, XAxis } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Button } from "./ui/button";

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
  return (
    <>
      <nav className="flex flex-wrap justify-center">
          <Button type="button" variant="ghost" className="w-fit rounded-none font-bold h-6 border-b-2 border-white">Week</Button>
          <Button type="button" variant="ghost" className="w-fit rounded-none font-bold h-6 text-stone-400">Month</Button>
          <Button type="button" variant="ghost" className="w-fit rounded-none font-bold h-6 text-stone-400">Year</Button>
      </nav>
      <ChartContainer
        config={chartConfig}
        className="bg-linear-to-t from-black to-stone-900 rounded-3xl"
      >
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
                    : "oklch(44.4% 0.011 73.639)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </>
  );
}
