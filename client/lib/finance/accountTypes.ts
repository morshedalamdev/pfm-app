import {
  BadgeDollarSignIcon,
  BanknoteIcon,
  CreditCardIcon,
  LandmarkIcon,
  SmartphoneIcon,
  WalletCardsIcon,
  type LucideIcon,
} from "lucide-react";

import type { AccountCreate } from "@/lib/finance/api";

export type CanonicalAccountType = AccountCreate["type"];

export const ACCOUNT_TYPE_OPTIONS: ReadonlyArray<{
  label: string;
  value: CanonicalAccountType;
}> = [
  { label: "Debit Card", value: "debit_card" },
  { label: "Credit Card", value: "credit_card" },
  { label: "Bank Account", value: "bank_account" },
  { label: "Mobile Banking", value: "mobile_banking" },
  { label: "Cash", value: "cash" },
];

const ACCOUNT_TYPE_LABELS: Record<CanonicalAccountType, string> = {
  bank_account: "Bank Account",
  cash: "Cash",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  mobile_banking: "Mobile Banking",
};

const ACCOUNT_TYPE_ICONS: Record<CanonicalAccountType, LucideIcon> = {
  bank_account: LandmarkIcon,
  cash: BanknoteIcon,
  credit_card: BadgeDollarSignIcon,
  debit_card: CreditCardIcon,
  mobile_banking: SmartphoneIcon,
};

const LEGACY_ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: "Bank Account",
  card: "Card",
  mobile_pay: "Mobile Banking",
  other: "Other",
  savings: "Savings",
  wallet: "Wallet",
};

const LEGACY_ACCOUNT_TYPE_ICONS: Record<string, LucideIcon> = {
  bank: LandmarkIcon,
  card: CreditCardIcon,
  mobile_pay: SmartphoneIcon,
  savings: LandmarkIcon,
  wallet: SmartphoneIcon,
};

export function getAccountTypeLabel(type: string): string {
  return (
    ACCOUNT_TYPE_LABELS[type as CanonicalAccountType] ??
    LEGACY_ACCOUNT_TYPE_LABELS[type] ??
    type.replaceAll("_", " ")
  );
}

export function getAccountTypeIcon(type: string): LucideIcon {
  return (
    ACCOUNT_TYPE_ICONS[type as CanonicalAccountType] ??
    LEGACY_ACCOUNT_TYPE_ICONS[type] ??
    WalletCardsIcon
  );
}
