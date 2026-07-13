"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  Landmark,
  Tags,
  Trophy,
} from "lucide-react";

import { useRecurringReminders } from "@/components/recurring/RecurringReminderProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listAccounts,
  listCategories,
  markRecurringIncomeReceived,
  type Account,
  type Category,
} from "@/lib/finance/api";
import { notifyFinanceDataChanged } from "@/lib/finance/events";
import { formatMoney } from "@/lib/finance/format";

export function RecurringIncomeAchievementPopup() {
  const { reminderQueue, removeReminder } = useRecurringReminders();
  const currentQueueItem = reminderQueue[0] ?? null;
  const currentReminder =
    currentQueueItem?.reminder_type === "income" ? currentQueueItem : null;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isReceiving, setIsReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const receiveInFlight = useRef(false);

  useEffect(() => {
    if (!currentReminder) return;
    const controller = new AbortController();
    void Promise.all([
      listAccounts({ signal: controller.signal }),
      listCategories("income", { signal: controller.signal }),
    ])
      .then(([nextAccounts, nextCategories]) => {
        if (!controller.signal.aborted) {
          setAccounts(nextAccounts);
          setCategories(nextCategories);
        }
      })
      .catch(() => {
        // The reminder retains safe fallback labels if lookup data is unavailable.
      });
    return () => controller.abort();
  }, [currentReminder]);

  const account = useMemo(
    () =>
      accounts.find(
        (candidate) => candidate.id === currentReminder?.rule.account_id,
      ),
    [accounts, currentReminder],
  );
  const categoryName = useMemo(
    () =>
      categories.find(
        (category) => category.id === currentReminder?.rule.category_id,
      )?.name ?? "Income",
    [categories, currentReminder],
  );

  if (!currentReminder) return null;

  const note = currentReminder.rule.description || "Recurring income";
  const accountName = account?.name ?? "Selected account";
  const accountCurrency = account?.currency ?? currentReminder.rule.currency;
  const dueDate = formatReminderDueDate(
    currentReminder.due_at,
    currentReminder.rule.timezone,
  );
  const handleReceived = async () => {
    if (receiveInFlight.current) return;
    receiveInFlight.current = true;
    setIsReceiving(true);
    setReceiveError(null);
    try {
      await markRecurringIncomeReceived(currentReminder.rule.id, {
        received_at: new Date().toISOString(),
      });
      removeReminder(currentReminder.reminder_key);
      notifyFinanceDataChanged();
    } catch (error) {
      setReceiveError(
        error instanceof Error
          ? error.message
          : "The recurring income could not be marked received.",
      );
    } finally {
      receiveInFlight.current = false;
      setIsReceiving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto border-emerald-400/50 bg-background p-0 shadow-[0_20px_80px_rgba(16,185,129,0.24)] sm:max-w-md [&_[data-slot=dialog-close]]:text-emerald-200">
        <div className="relative overflow-hidden border-b border-emerald-400/25 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent px-5 py-5 pr-12">
          <Trophy
            aria-hidden="true"
            className="absolute -right-5 -bottom-7 size-28 rotate-12 text-emerald-300/10"
          />
          <DialogHeader className="relative text-left">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-400/15 text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.18)]">
              <BadgeCheck aria-hidden="true" className="size-7" />
            </div>
            <p className="text-xs font-black tracking-[0.18em] text-emerald-300 uppercase">
              Income achievement
            </p>
            <DialogTitle className="break-words text-xl leading-snug text-emerald-100">
              Have you received your &ldquo;{note}&rdquo;?
            </DialogTitle>
            <DialogDescription className="text-emerald-100/70">
              Confirm this income only after it reaches your selected account.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 py-5">
          {reminderQueue.length > 1 && (
            <p className="text-xs font-bold tracking-wide text-emerald-300 uppercase">
              Reminder 1 of {reminderQueue.length}
            </p>
          )}

          <div>
            <p className="text-xs font-bold tracking-wide text-input uppercase">
              Income amount
            </p>
            <p className="mt-1 break-words text-3xl font-black text-emerald-200">
              {formatMoney(currentReminder.rule.amount, accountCurrency)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <AchievementDetail
              icon={<Tags aria-hidden="true" />}
              label="Category"
              value={categoryName}
            />
            <AchievementDetail
              icon={<Landmark aria-hidden="true" />}
              label="Account"
              value={accountName}
            />
            <AchievementDetail
              icon={<CircleDollarSign aria-hidden="true" />}
              label="Currency"
              value={accountCurrency}
            />
            <AchievementDetail
              icon={<CalendarDays aria-hidden="true" />}
              label="Due date"
              value={dueDate}
            />
            <AchievementDetail
              className="sm:col-span-2"
              label="Note"
              value={note}
            />
          </div>
        </div>

        <DialogFooter className="border-t border-emerald-400/20 bg-emerald-500/5 px-5 py-4 sm:justify-stretch">
          {receiveError ? (
            <p
              className="text-sm font-semibold text-destructive sm:col-span-2"
              role="alert"
            >
              {receiveError}
            </p>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            disabled
            aria-label="Delete recurring income"
          >
            Delete
          </Button>
          <Button
            type="button"
            disabled={isReceiving}
            onClick={() => void handleReceived()}
            className="bg-emerald-300 text-emerald-950 hover:bg-emerald-200"
            aria-label="Mark recurring income received"
          >
            <BadgeCheck aria-hidden="true" />
            {isReceiving ? "Receiving..." : "Received"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AchievementDetail({
  className = "",
  icon,
  label,
  value,
}: {
  className?: string;
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`rounded-lg border border-emerald-400/15 bg-secondary/70 p-3 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-emerald-300">
        {icon && <span className="[&_svg]:size-3.5">{icon}</span>}
        <p className="text-xs font-bold tracking-wide uppercase">{label}</p>
      </div>
      <p className="mt-1 break-words font-bold text-foreground">{value}</p>
    </div>
  );
}

function formatReminderDueDate(value: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  }
}
