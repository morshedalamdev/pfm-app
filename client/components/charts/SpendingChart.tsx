import { LabelList, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type SpendingChartItem = {
  fill: string;
  name: string;
  value: number;
};

export default function SpendingChart({ data }: { data: SpendingChartItem[] }) {
  const chartConfig = Object.fromEntries(
    data.map((item) => [
      item.name,
      {
        color: item.fill,
        label: item.name,
      },
    ]),
  ) satisfies ChartConfig;

  return (
    <ChartContainer
      config={chartConfig}
      className="[&_.recharts-text]:fill-primary mx-auto aspect-square -mt-6"
    >
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="label"
              hideLabel={true}
              hideIndicator={true}
            />
          }
        />
        <Pie data={data} dataKey="value">
          <LabelList
            dataKey="name"
            className="text-xs font-semibold"
            stroke="none"
            formatter={(value: string) => chartConfig[value]?.label ?? value}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
