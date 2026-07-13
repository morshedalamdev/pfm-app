"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CircleAlert, Landmark, Tags } from "lucide-react";

import {
  type RecurringExpenseQueueItem,
  useRecurringReminders,
} from "@/components/recurring/RecurringReminderProvider";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteRecurringRule,
  listAccounts,
  listCategories,
  markRecurringExpensePaid,
  type Account,
  type Category,
} from "@/lib/finance/api";
import { formatMoney } from "@/lib/finance/format";

export function RecurringExpenseWarningPopup() {
  const { reminderQueue, removeReminder } = useRecurringReminders();
  const expenseReminderQueue = useMemo(
    () =>
      reminderQueue.filter(
        (reminder): reminder is RecurringExpenseQueueItem =>
          reminder.reminder_type === "expense",
      ),
    [reminderQueue],
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dismissedReminderKey, setDismissedReminderKey] = useState<
    string | null
  >(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const paymentInFlight = useRef(false);
  const deleteInFlight = useRef(false);
  const currentQueueItem = reminderQueue[0] ?? null;
  const currentReminder =
    currentQueueItem?.reminder_type === "expense" ? currentQueueItem : null;

  useEffect(() => {
    if (!currentReminder) return;
    const controller = new AbortController();
    void Promise.all([
      listAccounts({ signal: controller.signal }),
      listCategories("expense", { signal: controller.signal }),
    ])
      .then(([nextAccounts, nextCategories]) => {
        if (!controller.signal.aborted) {
          setAccounts(nextAccounts);
          setCategories(nextCategories);
        }
      })
      .catch(() => {
        // The reminder still has safe fallback labels if lookup data is unavailable.
      });
    return () => controller.abort();
  }, [currentReminder]);

  const accountName = useMemo(
    () =>
      accounts.find((account) => account.id === currentReminder?.rule.account_id)
        ?.name ?? "Selected account",
    [accounts, currentReminder],
  );
  const categoryName = useMemo(
    () =>
      categories.find(
        (category) => category.id === currentReminder?.rule.category_id,
      )?.name ?? "Expense",
    [categories, currentReminder],
  );

  if (!currentReminder) return null;

  const isOpen = dismissedReminderKey !== currentReminder.reminder_key;
  const dueDate = formatReminderDueDate(
    currentReminder.due_at,
    currentReminder.rule.timezone,
  );
  const handlePaid = async () => {
    if (paymentInFlight.current) return;
    paymentInFlight.current = true;
    setIsPaying(true);
    setPaymentError(null);
    try {
      await markRecurringExpensePaid(currentReminder.rule.id, {
        paid_at: new Date().toISOString(),
      });
      removeReminder(currentReminder.reminder_key);
    } catch (error) {
      setPaymentError(
        error instanceof Error
          ? error.message
          : "The recurring expense could not be marked paid.",
      );
    } finally {
      paymentInFlight.current = false;
      setIsPaying(false);
    }
  };
  const handleDelete = async () => {
    if (deleteInFlight.current) return;
    deleteInFlight.current = true;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteRecurringRule(currentReminder.rule.id);
      removeReminder(currentReminder.reminder_key);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "The recurring expense could not be deleted.",
      );
    } finally {
      deleteInFlight.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      key={currentReminder.reminder_key}
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setDismissedReminderKey(currentReminder.reminder_key);
        }
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto border-amber-400/50 bg-background p-0 shadow-[0_20px_80px_rgba(245,158,11,0.22)] sm:max-w-md [&_[data-slot=dialog-close]]:text-amber-200">
        <div className="border-b border-amber-400/25 bg-amber-500/10 px-5 py-5 pr-12">
          <DialogHeader className="text-left">
            <div className="mb-2 flex size-11 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/15 text-amber-300">
              <CircleAlert aria-hidden="true" className="size-6" />
            </div>
            <DialogTitle className="text-xl text-amber-200">
              Recurring expense due
            </DialogTitle>
            <DialogDescription className="text-amber-100/75">
              This expense has not been deducted. Mark it paid only after you
              make the payment.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 py-5">
          {expenseReminderQueue.length > 1 && (
            <p className="text-xs font-bold tracking-wide text-amber-300 uppercase">
              Reminder 1 of {expenseReminderQueue.length}
            </p>
          )}

          <div>
            <p className="text-xs font-bold tracking-wide text-input uppercase">
              Amount due
            </p>
            <p className="mt-1 break-words text-3xl font-black text-amber-200">
              {formatMoney(
                currentReminder.rule.amount,
                currentReminder.rule.currency,
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <ReminderDetail
              icon={<Tags aria-hidden="true" />}
              label="Category"
              value={categoryName}
            />
            <ReminderDetail
              icon={<Landmark aria-hidden="true" />}
              label="Account"
              value={`${accountName} · ${currentReminder.rule.currency}`}
            />
            <ReminderDetail
              icon={<CalendarDays aria-hidden="true" />}
              label="Due date"
              value={dueDate}
            />
            <ReminderDetail
              className="sm:col-span-2"
              label="Note"
              value={currentReminder.rule.description || "No note"}
            />
          </div>
          {paymentError && (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {paymentError}
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-amber-400/20 bg-amber-500/5 px-5 py-4 sm:justify-stretch">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                disabled={isPaying || isDeleting}
                aria-label="Delete recurring expense"
              >
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete recurring expense?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently stops future reminders. It will not create a
                  transaction or change your account balance.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && (
                <p
                  role="alert"
                  className="text-sm font-semibold text-destructive"
                >
                  {deleteError}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={isDeleting}
                  onClick={(event) => {
                    event.preventDefault();
                    void handleDelete();
                  }}
                  className="border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting…" : "Delete permanently"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            type="button"
            disabled={isPaying || isDeleting}
            onClick={() => void handlePaid()}
            className="bg-amber-300 text-black hover:bg-amber-200"
            aria-label="Mark recurring expense paid"
          >
            {isPaying ? "Saving…" : "Paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReminderDetail({
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
      className={`rounded-lg border border-amber-400/15 bg-secondary/70 p-3 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-amber-300">
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
