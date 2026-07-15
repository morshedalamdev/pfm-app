import { getBackendJson, mutateBackendJson, sendBackendJson } from "@/lib/api/client";
import type {
  AccountList,
  CategoryList,
  Receipt,
  ReceiptList,
  Transaction,
  TransactionCreate,
  TransactionDetailData,
  TransactionHistoryData,
  TransactionKind,
  TransactionList,
  TransactionTypeFilter,
  TransactionUpdate,
  Transfer,
  TransferCreate,
} from "@/lib/transactions/types";

export const RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

export function listAccounts(): Promise<AccountList> {
  return getBackendJson<AccountList>("accounts?limit=100", "We couldn't load your accounts.");
}

export function listCategories(kind: "expense" | "income"): Promise<CategoryList> {
  return getBackendJson<CategoryList>(`categories?kind=${kind}&limit=100`, "We couldn't load your categories.");
}

export async function getComposerOptions(kind: TransactionKind) {
  const [accounts, categories] = await Promise.all([
    listAccounts(),
    kind === "transfer" ? Promise.resolve({ has_more: false, items: [], next_cursor: null }) : listCategories(kind),
  ]);
  return {
    accounts: accounts.items.filter((account) => !account.is_archived && !account.is_disabled),
    categories: categories.items.filter((category) => !category.is_archived),
  };
}

export function createTransaction(payload: TransactionCreate, idempotencyKey: string): Promise<Transaction> {
  return sendBackendJson<Transaction>("transactions", "POST", payload, { "idempotency-key": idempotencyKey });
}

export function createTransfer(payload: TransferCreate, idempotencyKey: string): Promise<Transfer> {
  return sendBackendJson<Transfer>("transactions/transfers", "POST", payload, { "idempotency-key": idempotencyKey });
}

export function getTransaction(transactionId: string): Promise<Transaction> {
  return getBackendJson<Transaction>(`transactions/${encodeURIComponent(transactionId)}`, "We couldn't load this transaction.");
}

export function updateTransaction(transactionId: string, payload: TransactionUpdate): Promise<Transaction> {
  return sendBackendJson<Transaction>(`transactions/${encodeURIComponent(transactionId)}`, "PATCH", payload);
}

export function deleteTransaction(transactionId: string): Promise<Transaction> {
  return sendBackendJson<Transaction>(`transactions/${encodeURIComponent(transactionId)}`, "DELETE");
}

type TransactionListParams = Readonly<{
  dateFrom: string;
  dateTo: string;
  search: string;
  type: TransactionTypeFilter;
}>;

function transactionQuery(params: TransactionListParams, type?: string): string {
  const query = new URLSearchParams({
    date_from: params.dateFrom,
    date_to: params.dateTo,
    limit: "100",
  });
  if (params.search.trim()) query.set("search", params.search.trim());
  if (type) query.set("type", type);
  return `transactions?${query.toString()}`;
}

export async function listTransactions(params: TransactionListParams): Promise<Transaction[]> {
  if (params.type === "transfer") {
    const [debits, credits] = await Promise.all([
      getBackendJson<TransactionList>(transactionQuery(params, "transfer_debit"), "We couldn't load your transfers."),
      getBackendJson<TransactionList>(transactionQuery(params, "transfer_credit"), "We couldn't load your transfers."),
    ]);
    const unique = new Map([...debits.items, ...credits.items].map((transaction) => [transaction.id, transaction]));
    return [...unique.values()].sort((a, b) => new Date(b.transaction_at).getTime() - new Date(a.transaction_at).getTime());
  }
  const response = await getBackendJson<TransactionList>(
    transactionQuery(params, params.type === "all" ? undefined : params.type),
    "We couldn't load your transactions.",
  );
  return response.items;
}

export async function getTransactionHistory(params: TransactionListParams): Promise<TransactionHistoryData> {
  const [accounts, expenseCategories, incomeCategories, transactions] = await Promise.all([
    listAccounts(),
    listCategories("expense"),
    listCategories("income"),
    listTransactions(params),
  ]);
  return {
    accounts: accounts.items.filter((account) => !account.is_archived),
    categories: [...expenseCategories.items, ...incomeCategories.items].filter((category) => !category.is_archived),
    transactions,
  };
}

export async function getTransactionDetail(transactionId: string): Promise<TransactionDetailData> {
  const transaction = await getTransaction(transactionId);
  const [accounts, expenseCategories, incomeCategories, receipts] = await Promise.all([
    listAccounts(),
    listCategories("expense"),
    listCategories("income"),
    transaction.type === "expense" || transaction.type === "income"
      ? listReceipts(transactionId)
      : Promise.resolve({ has_more: false, items: [], next_cursor: null }),
  ]);
  return {
    accounts: accounts.items.filter((account) => !account.is_archived),
    categories: [...expenseCategories.items, ...incomeCategories.items].filter((category) => !category.is_archived),
    receipts: receipts.items,
    transaction,
  };
}

export function listReceipts(transactionId: string): Promise<ReceiptList> {
  return getBackendJson<ReceiptList>(`receipts?transaction_id=${encodeURIComponent(transactionId)}&limit=100`, "We couldn't load the receipts.");
}

function receiptFilename(filename: string): string {
  return filename.replace(/[^\x20-\x7E]/g, "_").slice(0, 255) || "receipt";
}

export function validateReceipt(file: File): string | null {
  if (!file.size) return "Choose a non-empty receipt file";
  if (file.size > RECEIPT_MAX_BYTES) return "Receipt files must be 5 MB or smaller";
  if (!RECEIPT_ACCEPT.split(",").includes(file.type)) return "Use a PDF, JPEG, PNG, or WebP receipt";
  return null;
}

export function uploadReceipt(transactionId: string, file: File): Promise<Receipt> {
  return mutateBackendJson<Receipt>(`receipts?transaction_id=${encodeURIComponent(transactionId)}`, {
    body: file,
    fallback: "We couldn't upload the receipt.",
    headers: {
      "content-type": file.type,
      "x-receipt-filename": receiptFilename(file.name),
    },
    method: "POST",
  });
}

export function deleteReceipt(receiptId: string): Promise<Receipt> {
  return sendBackendJson<Receipt>(`receipts/${encodeURIComponent(receiptId)}`, "DELETE");
}
