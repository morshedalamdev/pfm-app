import { LabelList, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const data = [
  { name: "Food", value: 1120, fill: "var(--chart-1)" },
  { name: "Housing", value: 800, fill: "var(--chart-2)" },
  { name: "Transport", value: 640, fill: "var(--chart-3)" },
  { name: "Entertainment", value: 384, fill: "var(--chart-4)" },
  { name: "Others", value: 256, fill: "var(--chart-5)" },
];
const chartConfig = {
  Food: {
    label: "Food",
     color: "var(--chart-1)",
  },
  Housing: {
    label: "Housing",
    color: "var(--chart-2)",
  },
  Transport: {
    label: "Transport",
    color: "var(--chart-3)",
  },
  Entertainment: {
    label: "Entertainment",
    color: "var(--chart-4)",
  },
  Others: {
    label: "Others",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export default function SpendingChart() {
  return (
      <ChartContainer
        config={chartConfig}
        className="[&_.recharts-text]:fill-primary mx-auto aspect-square -mt-6"
      >
        <PieChart>
          <ChartTooltip
            content={<ChartTooltipContent nameKey="label" hideLabel={true} hideIndicator={true}  />}
          />
          <Pie data={data} dataKey="value">
            <LabelList
              dataKey="name"
              className="text-xs font-semibold"
              stroke="none"
              formatter={(value: keyof typeof chartConfig) =>
                chartConfig[value]?.label
              }
            />
          </Pie>
        </PieChart>
      </ChartContainer>
  );
}
