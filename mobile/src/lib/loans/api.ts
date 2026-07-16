import { getBackendJson, sendBackendJson } from "@/lib/api/client";
import type { AccountList, LoanDetailData, LoanDirectionFilter, LoanOverview, LoanPerson, LoanPersonCreate, LoanPersonList, LoanPersonUpdate, LoanRecord, LoanRecordCreate, LoanRecordList, LoanRecordUpdate, LoanSettlement, LoanSettlementCreate, LoanSettlementList, LoanStatusFilter, LoanSummary } from "@/lib/loans/types";

function activeAccounts(data: AccountList) { return data.items.filter((account) => !account.is_archived && !account.is_disabled); }
function activePeople(data: LoanPersonList) { return data.items.filter((person) => !person.archived_at); }

export async function getLoanOverview(direction: LoanDirectionFilter, status: LoanStatusFilter): Promise<LoanOverview> {
  const params = new URLSearchParams({ limit: "100", status });
  if (direction !== "all") params.set("direction", direction);
  const [summary, people, records, accounts] = await Promise.all([
    getBackendJson<LoanSummary>("loans/summary", "We couldn't load your loan summary."),
    getBackendJson<LoanPersonList>("loans/people?limit=100", "We couldn't load loan contacts."),
    getBackendJson<LoanRecordList>(`loans/records?${params.toString()}`, "We couldn't load loan records."),
    getBackendJson<AccountList>("accounts?limit=100", "We couldn't load your accounts."),
  ]);
  return { accounts: activeAccounts(accounts), people: activePeople(people), records: records.items.filter((record) => record.status !== "archived"), summary };
}

export async function getLoanEditorData(id?: string) {
  const [accounts, people, record] = await Promise.all([
    getBackendJson<AccountList>("accounts?limit=100", "We couldn't load your accounts."),
    getBackendJson<LoanPersonList>("loans/people?limit=100", "We couldn't load loan contacts."),
    id ? getLoanRecord(id) : Promise.resolve(null),
  ]);
  return { accounts: activeAccounts(accounts), people: activePeople(people), record };
}

export async function getLoanDetail(id: string): Promise<LoanDetailData> {
  const [record, accounts, people, settlements] = await Promise.all([
    getLoanRecord(id),
    getBackendJson<AccountList>("accounts?limit=100", "We couldn't load your accounts."),
    getBackendJson<LoanPersonList>("loans/people?limit=100", "We couldn't load loan contacts."),
    getBackendJson<LoanSettlementList>(`loans/records/${encodeURIComponent(id)}/settlements?limit=100`, "We couldn't load settlement history."),
  ]);
  return { accounts: activeAccounts(accounts), people: activePeople(people), record, settlements: settlements.items };
}

export function getLoanRecord(id: string) { return getBackendJson<LoanRecord>(`loans/records/${encodeURIComponent(id)}`, "We couldn't load this loan record."); }
export function createLoanRecord(payload: LoanRecordCreate) { return sendBackendJson<LoanRecord>("loans/records", "POST", payload); }
export function updateLoanRecord(id: string, payload: LoanRecordUpdate) { return sendBackendJson<LoanRecord>(`loans/records/${encodeURIComponent(id)}`, "PATCH", payload); }
export function deleteLoanRecord(id: string) { return sendBackendJson<LoanRecord>(`loans/records/${encodeURIComponent(id)}`, "DELETE"); }
export function createSettlement(id: string, payload: LoanSettlementCreate) { return sendBackendJson<LoanSettlement>(`loans/records/${encodeURIComponent(id)}/settlements`, "POST", payload); }

export async function getLoanPeople() { const data = await getBackendJson<LoanPersonList>("loans/people?limit=100", "We couldn't load loan contacts."); return activePeople(data); }
export function getLoanPerson(id: string) { return getBackendJson<LoanPerson>(`loans/people/${encodeURIComponent(id)}`, "We couldn't load this contact."); }
export function createLoanPerson(payload: LoanPersonCreate) { return sendBackendJson<LoanPerson>("loans/people", "POST", payload); }
export function updateLoanPerson(id: string, payload: LoanPersonUpdate) { return sendBackendJson<LoanPerson>(`loans/people/${encodeURIComponent(id)}`, "PATCH", payload); }
export function deleteLoanPerson(id: string) { return sendBackendJson<LoanPerson>(`loans/people/${encodeURIComponent(id)}`, "DELETE"); }
