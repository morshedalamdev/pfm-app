"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DotIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import SavingsItem from "@/components/items/SavingsItem";
import {
  createSavingsContribution,
  deleteSavingsGoal,
  listSavingsGoals,
  type SavingsGoal,
} from "@/lib/finance/api";
import { decimalInput, formatMoney } from "@/lib/finance/format";

export default function SavingsPage() {
  const [contributionError, setContributionError] = useState<string | null>(null);
  const [contributingId, setContributingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "completed" | "all">(
    "active",
  );
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadGoals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setGoals(await listSavingsGoals(filter));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Savings goals could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadGoals();
  }, [loadGoals]);

  const totals = useMemo(() => {
    const saved = goals.reduce(
      (total, goal) => total + Number(goal.progress.saved_amount),
      0,
    );
    const target = goals.reduce(
      (total, goal) => total + Number(goal.target_amount),
      0,
    );
    const active = goals.filter((goal) => goal.status === "active").length;
    return {
      active,
      percent: target > 0 ? (saved / target) * 100 : 0,
      saved,
      target,
    };
  }, [goals]);

  async function handleContribution(
    goalId: string,
    amount: string,
    date: Date,
    note: string,
  ) {
    setContributionError(null);
    setContributingId(goalId);
    try {
      await createSavingsContribution(goalId, {
        amount: decimalInput(amount),
        contributed_at: date.toISOString(),
        note: note || null,
      });
      await loadGoals();
    } catch (saveError) {
      setContributionError(
        saveError instanceof Error
          ? saveError.message
          : "Contribution could not be added.",
      );
    } finally {
      setContributingId(null);
    }
  }

  async function handleDelete(goalId: string) {
    setDeletingId(goalId);
    try {
      await deleteSavingsGoal(goalId);
      setGoals((items) => items.filter((item) => item.id !== goalId));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Savings goal could not be deleted.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Fragment>
      <Header homeBtn={true} title="Savings Goals">
        <Link href="/savings/create">
          <Button variant="link" size="icon-sm">
            <PlusIcon />
          </Button>
        </Link>
      </Header>
      <section className="mt-6 p-3 font-medium">
        <h2 className="text-input font-bold uppercase tracking-wide">
          Total Savings
        </h2>
        <h3 className="text-5xl font-bold">{formatMoney(totals.saved)}</h3>
        <h4 className="flex items-center mt-3">
          <span>{totals.active} Active Goals</span>
          <DotIcon />
          <span>Total: {formatMoney(totals.target)}</span>
        </h4>
        <div className="flex flex-wrap items-center justify-between gap-1.5 mt-3">
          <span>Overall Progress</span>
          <span>{Math.round(totals.percent)}% complete</span>
          <Progress value={Math.min(totals.percent, 100)} className="h-2" />
        </div>
      </section>
      <section className="p-3 pt-0">
        <div className="bg-secondary text-primary inline-flex h-8 w-full items-center justify-center rounded-full p-1">
          <Button
            onClick={() => setFilter("all")}
            variant={filter == "all" ? "default" : "ghost"}
            className="h-6 w-1/3 rounded-full"
          >
            All
          </Button>
          <Button
            onClick={() => setFilter("active")}
            variant={filter == "active" ? "default" : "ghost"}
            className="h-6 w-1/3 rounded-full"
          >
            Active
          </Button>
          <Button
            onClick={() => setFilter("completed")}
            variant={filter == "completed" ? "default" : "ghost"}
            className="h-6 w-1/3 rounded-full"
          >
            Completed
          </Button>
        </div>
      </section>
      <section className="space-y-3 p-3 h-[calc(100%-312px)] overflow-y-auto">
        {isLoading && (
          <p className="text-input text-sm">Loading savings goals...</p>
        )}
        {error && (
          <div className="space-y-2">
            <p className="text-destructive text-sm">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadGoals()}>
              Retry
            </Button>
          </div>
        )}
        {!isLoading && !error && goals.length === 0 && (
          <p className="text-input text-sm">No savings goals found.</p>
        )}
        {!isLoading &&
          !error &&
          goals.map((goal) => (
            <SavingsItem
              key={goal.id}
              contributionError={
                contributingId === goal.id ? contributionError : null
              }
              editHref={`/savings/${goal.id}`}
              id={goal.id}
              isContributing={contributingId === goal.id}
              isDeleting={deletingId === goal.id}
              monthlyTarget={formatMoney(
                goal.monthly_target_amount,
                goal.currency,
              )}
              name={goal.name}
              note={goal.note}
              onAddContribution={(amount, date, note) =>
                handleContribution(goal.id, amount, date, note)
              }
              onDelete={() => void handleDelete(goal.id)}
              percentComplete={Number(goal.progress.percent_complete)}
              savedAmount={formatMoney(
                goal.progress.saved_amount,
                goal.currency,
              )}
              targetAmount={formatMoney(goal.target_amount, goal.currency)}
              targetDate={goal.target_date ?? "No target date"}
            />
          ))}
      </section>
    </Fragment>
  );
}
