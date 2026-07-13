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
  type RecurringExpenseReminder,
} from "@/lib/finance/api";

type RecurringExpenseReminderContextValue = {
  reminderQueue: RecurringExpenseReminder[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  removeReminder: (reminderKey: string) => void;
};

const RecurringExpenseReminderContext =
  createContext<RecurringExpenseReminderContextValue | null>(null);

export function RecurringExpenseReminderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [reminderQueue, setReminderQueue] = useState<
    RecurringExpenseReminder[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReminders = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const reminders = await listDueRecurringExpenseReminders({ signal });
      if (!signal?.aborted) {
        setReminderQueue(normalizeReminderQueue(reminders));
      }
    } catch (loadError) {
      if (!signal?.aborted) {
        setReminderQueue([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Recurring expense reminders could not be loaded.",
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
    <RecurringExpenseReminderContext.Provider value={contextValue}>
      {children}
    </RecurringExpenseReminderContext.Provider>
  );
}

export function useRecurringExpenseReminders() {
  const context = useContext(RecurringExpenseReminderContext);
  if (!context) {
    throw new Error(
      "useRecurringExpenseReminders must be used inside RecurringExpenseReminderProvider",
    );
  }
  return context;
}

export function normalizeReminderQueue(
  reminders: RecurringExpenseReminder[],
): RecurringExpenseReminder[] {
  const uniqueReminders = new Map<string, RecurringExpenseReminder>();
  for (const reminder of reminders) {
    if (!uniqueReminders.has(reminder.reminder_key)) {
      uniqueReminders.set(reminder.reminder_key, reminder);
    }
  }
  return [...uniqueReminders.values()].sort(
    (left, right) =>
      Date.parse(left.due_at) - Date.parse(right.due_at) ||
      left.rule.id.localeCompare(right.rule.id),
  );
}
