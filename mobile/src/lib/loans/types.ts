import type { components } from "@generated/api-types";

export type Account = components["schemas"]["AccountResponse"];
export type AccountList = components["schemas"]["AccountListResponse"];
export type LoanPerson = components["schemas"]["LoanPersonResponse"];
export type LoanPersonCreate = components["schemas"]["LoanPersonCreateRequest"];
export type LoanPersonUpdate = components["schemas"]["LoanPersonUpdateRequest"];
export type LoanPersonList = components["schemas"]["LoanPersonListResponse"];
export type LoanRecord = components["schemas"]["LoanRecordResponse"];
export type LoanRecordCreate = components["schemas"]["LoanRecordCreateRequest"];
export type LoanRecordUpdate = components["schemas"]["LoanRecordUpdateRequest"];
export type LoanRecordList = components["schemas"]["LoanRecordListResponse"];
export type LoanSettlement = components["schemas"]["LoanSettlementResponse"];
export type LoanSettlementCreate = components["schemas"]["LoanSettlementCreateRequest"];
export type LoanSettlementList = components["schemas"]["LoanSettlementListResponse"];
export type LoanSummary = components["schemas"]["LoanSummaryResponse"];

export type LoanDirectionFilter = "all" | "given" | "taken";
export type LoanStatusFilter = "all" | "open" | "settled";
export type LoanOverview = Readonly<{ accounts: Account[]; people: LoanPerson[]; records: LoanRecord[]; summary: LoanSummary }>;
export type LoanDetailData = Readonly<{ accounts: Account[]; people: LoanPerson[]; record: LoanRecord; settlements: LoanSettlement[] }>;
