"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  listDueRecurringExpenseReminders,
  listDueRecurringIncomeReminders,
  type RecurringExpenseReminder,
  type RecurringIncomeReminder,
} from "@/lib/finance/api";

export type RecurringExpenseQueueItem = RecurringExpenseReminder & {
  reminder_type: "expense";
};

export type RecurringIncomeQueueItem = RecurringIncomeReminder & {
  reminder_type: "income";
};

export type RecurringReminder =
  | RecurringExpenseQueueItem
  | RecurringIncomeQueueItem;

type RecurringReminderContextValue = {
  reminderQueue: RecurringReminder[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  removeReminder: (reminderKey: string) => void;
};

const RecurringReminderContext =
  createContext<RecurringReminderContextValue | null>(null);

export function RecurringReminderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [reminderQueue, setReminderQueue] = useState<RecurringReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReminders = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const [expenseResult, incomeResult] = await Promise.allSettled([
        listDueRecurringExpenseReminders({ signal }),
        listDueRecurringIncomeReminders({ signal }),
      ]);
      if (signal?.aborted) return;

      const reminders: RecurringReminder[] = [];
      if (expenseResult.status === "fulfilled") {
        reminders.push(
          ...expenseResult.value.map((reminder) => ({
            ...reminder,
            reminder_type: "expense" as const,
          })),
        );
      }
      if (incomeResult.status === "fulfilled") {
        reminders.push(
          ...incomeResult.value.map((reminder) => ({
            ...reminder,
            reminder_type: "income" as const,
          })),
        );
      }
      setReminderQueue(normalizeRecurringReminderQueue(reminders));

      const failedResult = [expenseResult, incomeResult].find(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );
      if (failedResult) {
        setError(
          failedResult.reason instanceof Error
            ? failedResult.reason.message
            : "Some recurring reminders could not be loaded.",
        );
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadReminders(controller.signal);
    return () => controller.abort();
  }, [loadReminders]);

  const reload = useCallback(() => loadReminders(), [loadReminders]);
  const removeReminder = useCallback((reminderKey: string) => {
    setReminderQueue((currentQueue) =>
      currentQueue.filter(
        (reminder) => reminder.reminder_key !== reminderKey,
      ),
    );
  }, []);
  const contextValue = useMemo(
    () => ({ reminderQueue, isLoading, error, reload, removeReminder }),
    [error, isLoading, reload, reminderQueue, removeReminder],
  );

  return (
    <RecurringReminderContext.Provider value={contextValue}>
      {children}
    </RecurringReminderContext.Provider>
  );
}

export function useRecurringReminders() {
  const context = useContext(RecurringReminderContext);
  if (!context) {
    throw new Error(
      "useRecurringReminders must be used inside RecurringReminderProvider",
    );
  }
  return context;
}

export function normalizeRecurringReminderQueue(
  reminders: RecurringReminder[],
): RecurringReminder[] {
  const uniqueReminders = new Map<string, RecurringReminder>();
  for (const reminder of reminders) {
    const uniqueKey = `${reminder.reminder_type}:${reminder.reminder_key}`;
    if (!uniqueReminders.has(uniqueKey)) {
      uniqueReminders.set(uniqueKey, reminder);
    }
  }
  return [...uniqueReminders.values()].sort(
    (left, right) =>
      Date.parse(left.due_at) - Date.parse(right.due_at) ||
      left.rule.id.localeCompare(right.rule.id) ||
      left.reminder_type.localeCompare(right.reminder_type),
  );
}
