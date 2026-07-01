import { Line, LineChart, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

export type IncomeVsExpensePoint = {
  expense: number;
  income: number;
  label: string;
};

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

export default function IncomeVsExpenseChart({
  data,
}: {
  data: IncomeVsExpensePoint[];
}) {
  return (
    <div className="bg-linear-to-t from-secondary to-secondary/50 border border-input p-2 rounded-md">
      <ChartContainer config={chartConfig}>
        <LineChart accessibilityLayer data={data}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent hideLabel={true} hideIndicator={true} />
            }
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
