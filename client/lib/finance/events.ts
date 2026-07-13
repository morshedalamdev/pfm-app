const FINANCE_DATA_CHANGED_EVENT = "pfm:finance-data-changed";

export function notifyFinanceDataChanged(): void {
  window.dispatchEvent(new Event(FINANCE_DATA_CHANGED_EVENT));
}

export function subscribeFinanceDataChanged(listener: () => void): () => void {
  window.addEventListener(FINANCE_DATA_CHANGED_EVENT, listener);
  return () => window.removeEventListener(FINANCE_DATA_CHANGED_EVENT, listener);
}
