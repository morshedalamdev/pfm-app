import { getBackendJson } from "@/lib/api/client";
import { getDefaultAccount } from "@/lib/accounts/utils";
import type { AccountList, DashboardReport, HomeData, TransactionList } from "@/lib/home/types";

const HOME_PERIOD = "month" as const;
const TRANSACTION_LIMIT = 10;

export async function getHomeData(): Promise<HomeData> {
  const [dashboard, accounts] = await Promise.all([
    getBackendJson<DashboardReport>(`reports/dashboard?period=${HOME_PERIOD}&type=expense`, "We couldn't load your money overview."),
    getBackendJson<AccountList>("accounts?limit=100", "We couldn't load your accounts."),
  ]);
  const query = new URLSearchParams({
    date_from: dashboard.range.start_at,
    date_to: dashboard.range.end_at,
    limit: String(TRANSACTION_LIMIT),
  });
  const transactions = await getBackendJson<TransactionList>(
    `transactions?${query.toString()}`,
    "We couldn't load your recent transactions.",
  );

  return { dashboard, defaultAccount: getDefaultAccount(accounts.items), transactions };
}
