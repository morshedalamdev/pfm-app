import type { LoanRecord } from "@/lib/loans/types";

export function loanPersonName(record: LoanRecord, people: { id: string; name: string }[]) { return people.find((person) => person.id === record.person_id)?.name ?? "Loan contact"; }
export function loanPercent(record: LoanRecord) { const principal = Number(record.principal_amount); return principal > 0 ? Math.max(0, Math.min(100, (Number(record.settled_amount) / principal) * 100)) : 0; }
export function isOverdue(record: LoanRecord, today = new Date().toISOString().slice(0, 10)) { return record.status === "open" && Boolean(record.repay_date && record.repay_date < today && Number(record.outstanding_amount) > 0); }
export function localDateTime(value = new Date()) { const offset = value.getTimezoneOffset() * 60_000; return new Date(value.getTime() - offset).toISOString().slice(0, 16); }
export function isPositiveMoney(value: string) { return /^(?!0+(?:\.0{1,4})?$)\d{1,14}(?:\.\d{1,4})?$/.test(value.trim()); }
