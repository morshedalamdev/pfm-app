import { getBackendJson, mutateBackendJson, sendBackendJson } from "@/lib/api/client";
import type {
  AccountList,
  CategoryList,
  Receipt,
  ReceiptList,
  Transaction,
  TransactionCreate,
  TransactionKind,
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
