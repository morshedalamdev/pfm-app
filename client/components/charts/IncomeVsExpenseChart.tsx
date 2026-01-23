import { LabelList, Line, LineChart, XAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

const Days = [
  { day: 1, income: 0, expense: 0 },
  { day: 2, income: 0, expense: 20 },
  { day: 3, income: 0, expense: 0 },
  { day: 4, income: 0, expense: 15 },
  { day: 5, income: 0, expense: 0 },
  { day: 6, income: 0, expense: 25 },
  { day: 7, income: 0, expense: 0 },
  { day: 8, income: 0, expense: 10 },
  { day: 9, income: 0, expense: 0 },
  { day: 10, income: 200, expense: 80 },
  { day: 11, income: 0, expense: 0 },
  { day: 12, income: 0, expense: 30 },
  { day: 13, income: 0, expense: 0 },
  { day: 14, income: 0, expense: 18 },
  { day: 15, income: 0, expense: 0 },
  { day: 16, income: 0, expense: 22 },
  { day: 17, income: 0, expense: 0 },
  { day: 18, income: 0, expense: 0 },
  { day: 19, income: 0, expense: 35 },
  { day: 20, income: 0, expense: 0 },
  { day: 21, income: 0, expense: 12 },
  { day: 22, income: 0, expense: 0 },
  { day: 23, income: 0, expense: 0 },
  { day: 24, income: 0, expense: 28 },
  { day: 25, income: 100, expense: 50 },
  { day: 26, income: 0, expense: 0 },
  { day: 27, income: 0, expense: 15 },
  { day: 28, income: 0, expense: 0 },
  { day: 29, income: 0, expense: 20 },
  { day: 30, income: 0, expense: 0 },
];

const chartConfig = {
  income: {
    label: "Income",
    color: "var(--chart-1)",
  },
  expense: {
    label: "Expense",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export default function IncomeVsExpenseChart() {
  return (
    <div className="bg-linear-to-t from-secondary to-secondary/50 border border-input p-2 rounded-md">
      <ChartContainer config={chartConfig}>
        <LineChart accessibilityLayer data={Days}>
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel={true} hideIndicator={true} />}
            />
          <Line
            dataKey="income"
            type="monotone"
            stroke="var(--color-income)"
            strokeWidth={2}
            dot={{
              fill: "var(--color-income)",
            }}
          />
          <Line
            dataKey="expense"
            type="monotone"
            stroke="var(--color-expense)"
            strokeWidth={2}
            dot={{
              fill: "var(--color-expense)",
            }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
