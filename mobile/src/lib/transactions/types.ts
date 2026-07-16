import type { components } from "@generated/api-types";

export type Account = components["schemas"]["AccountResponse"];
export type AccountList = components["schemas"]["AccountListResponse"];
export type Category = components["schemas"]["CategoryResponse"];
export type CategoryList = components["schemas"]["CategoryListResponse"];
export type Receipt = components["schemas"]["ReceiptResponse"];
export type ReceiptList = components["schemas"]["ReceiptListResponse"];
export type Transaction = components["schemas"]["TransactionResponse"];
export type TransactionList = components["schemas"]["TransactionListResponse"];
export type TransactionCreate = components["schemas"]["TransactionCreateRequest"];
export type TransactionUpdate = components["schemas"]["TransactionUpdateRequest"];
export type TransferCreate = components["schemas"]["TransferCreateRequest"];
export type Transfer = components["schemas"]["TransferResponse"];

export type TransactionKind = "expense" | "income" | "transfer";
export type TransactionTypeFilter = "all" | TransactionKind;
export type TransactionPeriod = "day" | "week" | "month";

export type TransactionHistoryOptions = Readonly<{
  accounts: Account[];
  categories: Category[];
}>;

export type TransactionDetailData = Readonly<{
  accounts: Account[];
  categories: Category[];
  receipts: Receipt[];
  transaction: Transaction;
}>;
