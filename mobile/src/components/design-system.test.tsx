import { CircleDot, WalletCards } from "lucide-react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExpenseRow } from "@/components/finance/expense-row";
import { MoneyStatCard } from "@/components/finance/money-stat-card";
import { ProgressBar } from "@/components/ui/progress-bar";

describe("mobile design system", () => {
  it("renders a finance stat with its accessible content", () => {
    render(
      <MoneyStatCard accent="blue" icon={WalletCards} label="Income" value="$4,875.12" />,
    );

    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByText("$4,875.12")).toBeInTheDocument();
  });

  it("clamps progress values to a valid percentage", () => {
    render(<ProgressBar label="Savings progress" value={140} />);

    expect(screen.getByRole("progressbar", { name: "Savings progress" })).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("renders expense comparison details", () => {
    render(
      <ExpenseRow
        accent="blue"
        amount="$8,750.00"
        change="+12%"
        icon={CircleDot}
        label="Groceries"
        percent={31}
      />,
    );

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "31");
  });
});
