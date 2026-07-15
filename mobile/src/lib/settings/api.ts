import { getBackendJson, sendBackendJson } from "@/lib/api/client";
import type {
  Account,
  AccountCreate,
  AccountList,
  Category,
  CategoryCreate,
  CategoryList,
  LoanData,
  LoanPerson,
  LoanPersonCreate,
  LoanPersonList,
  LoanRecord,
  LoanRecordCreate,
  LoanRecordList,
  LoanSettlementCreate,
  LoanSummary,
  Notification,
  NotificationList,
  Profile,
  ProfileUpdate,
  RecurringData,
  RecurringRule,
  RecurringRuleCreate,
  RecurringRuleList,
} from "@/lib/settings/types";

export function getProfile() {
  return getBackendJson<Profile>("users/me", "We couldn't load your profile.");
}

export function updateProfile(payload: ProfileUpdate) {
  return sendBackendJson<Profile>("users/me", "PATCH", payload);
}

export function getAccounts() {
  return getBackendJson<AccountList>("accounts?limit=100", "We couldn't load your accounts.");
}

export function createAccount(payload: AccountCreate) {
  return sendBackendJson<Account>("accounts", "POST", payload);
}

export function setDefaultAccount(id: string) {
  return sendBackendJson<Account>(`accounts/${encodeURIComponent(id)}/default`, "PATCH");
}

export function disableAccount(id: string) {
  return sendBackendJson<Account>(`accounts/${encodeURIComponent(id)}/disable`, "PATCH");
}

export function getCategories() {
  return getBackendJson<CategoryList>("categories?limit=100", "We couldn't load your categories.");
}

export function createCategory(payload: CategoryCreate) {
  return sendBackendJson<Category>("categories", "POST", payload);
}

export function archiveCategory(id: string) {
  return sendBackendJson<Category>(`categories/${encodeURIComponent(id)}`, "DELETE");
}

export async function getLoanData(): Promise<LoanData> {
  const [summary, people, records, accounts] = await Promise.all([
    getBackendJson<LoanSummary>("loans/summary", "We couldn't load your loan summary."),
    getBackendJson<LoanPersonList>("loans/people?limit=100", "We couldn't load your loan contacts."),
    getBackendJson<LoanRecordList>("loans/records?status=open&limit=100", "We couldn't load your loans."),
    getAccounts(),
  ]);
  return {
    accounts: accounts.items.filter((item) => !item.is_archived && !item.is_disabled),
    people: people.items.filter((item) => !item.archived_at),
    records: records.items,
    summary,
  };
}

export function createLoanPerson(payload: LoanPersonCreate) {
  return sendBackendJson<LoanPerson>("loans/people", "POST", payload);
}

export function createLoanRecord(payload: LoanRecordCreate) {
  return sendBackendJson<LoanRecord>("loans/records", "POST", payload);
}

export function settleLoan(recordId: string, payload: LoanSettlementCreate) {
  return sendBackendJson(`loans/records/${encodeURIComponent(recordId)}/settlements`, "POST", payload);
}

export async function getRecurringData(): Promise<RecurringData> {
  const [rules, accounts, categories] = await Promise.all([
    getBackendJson<RecurringRuleList>("recurring-rules?status=all&limit=100", "We couldn't load recurring items."),
    getAccounts(),
    getCategories(),
  ]);
  return {
    accounts: accounts.items.filter((item) => !item.is_archived && !item.is_disabled),
    categories: categories.items.filter((item) => !item.is_archived),
    rules: rules.items.filter((item) => item.status !== "archived"),
  };
}

export function createRecurringRule(payload: RecurringRuleCreate) {
  return sendBackendJson<RecurringRule>("recurring-rules", "POST", payload);
}

export function changeRecurringState(rule: RecurringRule) {
  const action = rule.status === "paused" ? "resume" : "pause";
  return sendBackendJson<RecurringRule>(`recurring-rules/${encodeURIComponent(rule.id)}/${action}`, "POST");
}

export function getNotifications(unreadOnly = false) {
  return getBackendJson<NotificationList>(`notifications?limit=100&unread_only=${unreadOnly}`, "We couldn't load your notifications.");
}

export function markNotificationRead(id: string) {
  return sendBackendJson<Notification>(`notifications/${encodeURIComponent(id)}/read`, "POST");
}

export function markAllNotificationsRead() {
  return sendBackendJson<{ read_at: string; updated_count: number }>("notifications/read-all", "POST");
}
