import type { components } from "@generated/api-types";

export type Account = components["schemas"]["AccountResponse"];
export type AccountCreate = components["schemas"]["AccountCreateRequest"];
export type AccountList = components["schemas"]["AccountListResponse"];
export type Category = components["schemas"]["CategoryResponse"];
export type CategoryCreate = components["schemas"]["CategoryCreateRequest"];
export type CategoryList = components["schemas"]["CategoryListResponse"];
export type LoanPerson = components["schemas"]["LoanPersonResponse"];
export type LoanPersonCreate = components["schemas"]["LoanPersonCreateRequest"];
export type LoanPersonList = components["schemas"]["LoanPersonListResponse"];
export type LoanRecord = components["schemas"]["LoanRecordResponse"];
export type LoanRecordCreate = components["schemas"]["LoanRecordCreateRequest"];
export type LoanRecordList = components["schemas"]["LoanRecordListResponse"];
export type LoanSettlementCreate = components["schemas"]["LoanSettlementCreateRequest"];
export type LoanSummary = components["schemas"]["LoanSummaryResponse"];
export type Notification = components["schemas"]["NotificationResponse"];
export type NotificationList = components["schemas"]["NotificationListResponse"];
export type Profile = components["schemas"]["UserResponse"];
export type ProfileUpdate = components["schemas"]["UserUpdateRequest"];
export type RecurringRule = components["schemas"]["RecurringRuleResponse"];
export type RecurringRuleCreate = components["schemas"]["RecurringRuleCreateRequest"];
export type RecurringRuleList = components["schemas"]["RecurringRuleListResponse"];

export type SettingsSection = "overview" | "profile" | "accounts" | "categories" | "loans" | "recurring" | "notifications";

export type LoanData = Readonly<{
  accounts: Account[];
  people: LoanPerson[];
  records: LoanRecord[];
  summary: LoanSummary;
}>;

export type RecurringData = Readonly<{
  accounts: Account[];
  categories: Category[];
  rules: RecurringRule[];
}>;
