# UI Redesign Agent 04 - Website Dashboard Redesign

## Reference Files

All expected read-only reference files are present under `ref-ui/` and were inspected:

- `IMG-01.jpeg` - primary dashboard direction with a purple balance hero, compact income/expense cards, recent transaction rhythm, soft card surfaces, and mobile-browser density.
- `IMG-02.jpeg` - report and dashboard metric proportions, compact section headings, segmented controls, and transaction/report row density.
- `IMG-03.jpeg` - donut-chart language, centered total treatment, segmented palette, and tooltip direction. This should remain optional because the current dashboard endpoint provides time-series buckets.
- `IMG-04.jpeg` - savings goal preview card, progress hierarchy, remaining amount, and warning/footer treatment.
- `IMG-05.jpeg` - dense category or budget-health rows with right-aligned values, progress tracks, and small badges.
- `IMG-06.jpeg` - financial metric cards, semantic icon surfaces, large amount typography, and high-contrast status/insight banner direction.

The images remain outside production code and public assets. No sample balances, transactions, profile imagery, account names, dates, branding, `Get Pro` upsells, or fake insight copy should be copied into the application.

## Existing Dashboard Baseline

The current home dashboard lives in `client/app/(dashboard)/page.tsx` and is a client component. It renders:

- A centered available-balance section from `useHomeBalanceSource()`.
- Income and expense summary cards from `useDashboardData()`.
- The legacy `RootChart` bar chart with period and income/expense controls.
- A recent transaction preview using `TransactionItem`.

Current behavior to preserve until redesigned:

- Auth protection is provided by the Agent 02 authenticated route shell.
- The dashboard report query uses the typed API layer through `apiGet`.
- Recent transactions are loaded from the server, not fixtures.
- Category labels are resolved from the category endpoint.
- Account currency fallback for transaction rows is resolved through the accounts endpoint.
- Section-level loading, retry, empty, and error states exist for the report/chart and recent transactions.
- Transaction rows link to `/transaction/{id}`.

Current production UI gaps:

- The visual balance hero uses the default account current balance from `GET /api/v1/accounts`, while the dashboard report also returns `available_balance`. This creates two balance sources on the page.
- `report.available_balance` and `report.net_flow_amount` are currently not rendered.
- Only income and expense are shown; net cash flow is omitted.
- The chart shows one selected transaction type at a time rather than income versus expenses together.
- Accounts, budgets, savings goals, upcoming commitments, and financial status are not shown on the dashboard.
- The page is still composed for the legacy narrow mobile content wrapper and does not use a responsive dashboard grid.
- The current page lacks one explicit page-level `h1`; route title may be supplied by the shell, but the dashboard content itself starts with section headings.
- `RootChart` uses hardcoded black/white styling and literal OKLCH bar colors instead of Agent 01 chart tokens.
- `HeaderItem` and `TransactionItem` predate Agent 03 components and retain hardcoded or page-local styling.

## Existing API Contracts

Current dashboard endpoint:

```text
GET /api/v1/reports/dashboard?period=week|month|year&type=income|expense&as_of=YYYY-MM-DD
```

Current response shape from `DashboardReportResponse`:

```text
period
type
range.start_at
range.end_at
range.timezone
currency
available_balance
income_amount
expense_amount
net_flow_amount
buckets[]
  label
  start_at
  end_at
  amount
  is_current
```

Related typed data sources available now:

- Accounts: `GET /api/v1/accounts`, exposed through `listAccounts()`.
- Recent transactions: `GET /api/v1/transactions?limit=6`, currently called directly in `useDashboardData()`.
- Categories: `GET /api/v1/categories?limit=100`, currently called directly in `useDashboardData()`.
- Budgets: `GET /api/v1/budgets?month=YYYY-MM&include_archived=false&limit=100`, exposed through `listBudgets(month)`.
- Savings goals: `GET /api/v1/savings-goals?status=active|completed|all&limit=100`, exposed through `listSavingsGoals(status)`.
- Recurring due reminders: `GET /api/v1/recurring-rules/due-expenses` and `GET /api/v1/recurring-rules/due-incomes`.
- Loans/debts: `GET /api/v1/loans/records`, `GET /api/v1/loans/people`, and `GET /api/v1/loans/summary`.
- Analytics cash flow: `GET /api/v1/reports/cash-flow`, exposed through `getCashFlowReport()`, if a future phase needs combined income/expense buckets beyond the dashboard endpoint.

Generated API files were inspected only. They must not be manually edited.

## Dashboard Data Feasibility Matrix

| Section | Required data | Current source | Available now | Needs frontend derivation | Blocked | Deferred |
| --- | --- | --- | --- | --- | --- | --- |
| Balance hero | Current balance, currency, selected period, optional comparison | `DashboardReportResponse.available_balance` and current `useHomeBalanceSource()` default account | Yes | Choose one source of truth and label it accurately | No | Previous-period comparison |
| Financial summary | Income, expenses, net cash flow, currency, period | `DashboardReportResponse` | Yes | Net flow already provided; can also verify as income minus expense from same response | No | Available-to-spend unless supported later |
| Cash-flow chart | Income and expense over time | Dashboard buckets by selected `type`; analytics cash-flow endpoint has combined buckets | Yes | Prefer one request shape in phase 04.3; map buckets to Recharts series | No | Donut chart unless a composition view is justified |
| Accounts overview | Active accounts, type, currency, current balance, default state | `listAccounts()` | Yes | Limit records; omit percentages for mixed currencies | No | Account management actions |
| Budget health | Category/global budget, spent, limit, remaining, status, progress | `listBudgets(month)` | Yes | Map `on_track`/`over_budget`; derive near-limit only if approved threshold is defined | No | Cross-period budget rules beyond current month/selected month |
| Savings goals | Name, saved, target, remaining, progress, target date, status | `listSavingsGoals("active")` | Yes | Limit records; map existing progress to shared card | No | Behind-schedule status |
| Upcoming commitments | Reliable due recurring or loan obligation data | Due recurring endpoints and loan records with `repay_date` | Partial | Merge and sort due reminders and open loan records only if copy clearly describes source | No for due reminders; loan schedule needs care | Unsupported inferred schedules |
| Recent transactions | Latest transactions, account, category, date, amount, type | Transactions plus categories plus accounts | Yes | Resolve category/account names and transfer display | No | Pagination on dashboard |
| Financial status | Deterministic, rule-based status | Loaded report, budgets, savings, transactions | Yes | Derive simple statements from loaded data only | No | AI insights, advice, or unsupported comparisons |

## Period Model

The dashboard report supports exactly:

```text
week
month
year
```

The current frontend stores `period` in `useDashboardData()` and passes it into `RootChart`. Changing the period refetches the dashboard report. Recent transactions are not period-filtered. Budgets currently use `YYYY-MM`, so later phases need an explicit mapping if budget health follows the dashboard period; the safest initial dashboard budget preview is current-month only unless the selected period is month-compatible.

The current report endpoint also accepts `type=income|expense` for chart bucket selection. This is not a period source and should not become a second dashboard period state.

## Balance Source

Current page source:

- `useHomeBalanceSource()` calls `listAccounts()` and displays `getDefaultAccount(accounts)?.current_balance`.
- It labels the displayed amount with the default account name.

Current report source:

- `GET /api/v1/reports/dashboard` returns `available_balance`.
- Backend calculation sums active account opening balances plus non-voided income and transfer credits minus expenses and transfer debits on non-archived accounts.

Audit finding:

- The page currently displays default-account balance rather than report available balance. Phase 04.2 should choose the approved balance source and avoid presenting a default-account value as total current balance.

## Financial Summary Source

`income_amount`, `expense_amount`, and `net_flow_amount` come from the same dashboard report response, same period, and same reported currency. This is the safest source for the financial summary.

Unsupported in the current dashboard contract:

- Previous comparable period change.
- Percent change versus previous period.
- Available-to-spend.

## Chart Source

Current chart source:

- `DashboardReportResponse.buckets` returns one selected `type` series.
- Week buckets are seven Sunday-start daily buckets.
- Month buckets are daily buckets for the month.
- Year buckets are calendar-month buckets.

Alternative existing source:

- `GET /api/v1/reports/cash-flow` returns income, expense, and net-flow buckets for a supplied date range and interval.

Audit finding:

- The Agent 04 preferred chart is income versus expenses over time. The current dashboard endpoint can support that only with two report requests or a chart-type toggle; the analytics cash-flow endpoint can support a combined series if the frontend derives the selected dashboard date range.

## Account Preview Source

`listAccounts()` returns active accounts by default with:

```text
id
name
type
currency
opening_balance
current_balance
is_default
is_disabled
is_archived
timestamps
```

Accounts can be previewed now. Percent-of-total should be omitted when currencies differ, unless a later backend response provides normalized totals.

## Budget Preview Source

`listBudgets(month)` returns current month budget rows with:

```text
category_id
category_name
limit_amount
currency
period_start
period_end
progress.spent_amount
progress.remaining_amount
progress.percent_used
progress.status
```

Budget progress is reliable because it is computed by the backend from non-voided expense rows. The current enum is `on_track|over_budget`; a `near_limit` dashboard label would need an explicit frontend threshold or backend support before use.

## Savings Preview Source

`listSavingsGoals("active")` returns:

```text
name
target_amount
monthly_target_amount
currency
target_date
status
progress.saved_amount
progress.remaining_amount
progress.percent_complete
progress.is_target_met
```

Savings progress is reliable for active goals. Behind-schedule status is not provided and should not be invented in Agent 04.

## Upcoming Commitments Source

Reliable sources available now:

- Due recurring expense reminders with `due_at`, `period_key`, and `rule`.
- Due recurring income reminders with `due_at`, `period_key`, and `rule`.
- Loan/debt records include `repay_date`, `outstanding_amount`, `status`, and direction.

Audit finding:

- Recurring due reminders are reliable for currently due items only. They should not be expanded into future schedules on the dashboard without backend support.
- Loan repay dates can identify dated open obligations, but person names require joining `listLoanPeople()` and repayment semantics should be described carefully.

## Recent Transaction Source

Current source:

- `GET /api/v1/transactions?limit=6`
- `GET /api/v1/categories?limit=100`
- `GET /api/v1/accounts?include_archived=false&limit=100`

Current mapping:

- Category names are mapped by `category_id`.
- Transfer rows fall back to `Transfer In` or `Transfer Out`.
- Account currencies are used as a fallback for row currency.
- Transaction date and time are formatted locally.

Audit finding:

- Account names are not currently displayed in dashboard recent rows, but the account data is already fetched and can support that in phase 04.3.

## Cross-Currency Risks

Known risks:

- The report backend currently labels dashboard aggregates with `current_user.base_currency`, while report repository calculations sum transaction and account amounts without visible currency conversion in the inspected code.
- The current page hero avoids a cross-account total by showing only the default account, but the report response exposes an available-balance total.
- Account preview percentages are unsafe for mixed currencies.
- Savings and budget preview totals should not be summed across mixed currencies.

Agent 04 implementation rule:

- Do not introduce new cross-currency totals or percentages in the frontend. Display per-record currency values unless the backend provides a normalized result.

## Planned Files to Change

Likely later Agent 04 phases may modify or create:

- `client/app/(dashboard)/page.tsx`
- `client/lib/dashboard/useDashboardData.ts`
- Dashboard-specific view-model helpers under `client/lib/dashboard/`
- Dashboard-specific presentational components if needed
- Focused dashboard E2E tests under `client/e2e/`
- `docs/ui-redesign/04_DASHBOARD_REDESIGN.md`
- `docs/ui-redesign/04_DASHBOARD_REDESIGN_TEST_REPORT.md`
- `PFM_PROJECT_STATE.md`

Production dashboard behavior was not changed in Phase 04.1.

## Blockers

- No Agent 04 dependency blocker was found. Agent 01, Agent 02, and Agent 03 are complete with documented handoff reports.
- Full `npm run e2e` has a known pre-existing integrated finance blocker in recent UI redesign phases around the recurring warning `Groceries` assertion. Phase 04.1 should record any reproduction rather than treating it as a dashboard documentation regression.
- Sandboxed production builds may fail without network access because `next/font/google` fetches the existing Urbanist font.
- Full E2E requires local PostgreSQL, API, Next.js, and browser processes; sandboxed runs may require approval.

## Deferred Data Gaps

- Previous-period balance, income, expense, or net-flow comparison is not available from the dashboard endpoint.
- Available-to-spend is not available as a verified dashboard field.
- Budget `near_limit` status is not available as a backend enum.
- Savings behind-schedule status is not available.
- Future recurring schedules beyond currently due reminders should not be inferred.
- Donut/category composition is available from analytics spending-by-category, but it is not the preferred first dashboard chart while cash-flow trend data exists.
