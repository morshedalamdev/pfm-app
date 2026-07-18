# UI API Matrix

Phase 00.2 inspected the implemented Next.js routes, data-bearing components, charts, filters, drawers, forms, constants, and helper files under `client/app`, `client/components`, and `client/lib`. Milestone 08 has since added generated OpenAPI contracts, typed frontend API helpers, auth/session state, and server-backed dashboard, analytics, transaction, budget, and savings surfaces. Remaining deferred surfaces are documented below and must not use runtime finance fixtures.

## Finance Core API Contract Status

Phase 08.5 reviewed the implemented finance, budget, savings, report, and frontend integration state recorded below. Account, category, transaction, transfer, budget CRUD/progress, savings goal/contribution, dashboard report, and analytics report APIs are available under `/api/v1` and are consumed by the corresponding milestone 08 frontend surfaces. Budget setup templates, loans, and profile mutation remain deferred unless a later phase implements matching backend contracts.

- Accounts: `POST /api/v1/accounts`, `GET /api/v1/accounts`, `GET /api/v1/accounts/{account_id}`, `PATCH /api/v1/accounts/{account_id}`, and `DELETE /api/v1/accounts/{account_id}`. List responses use `items`, `next_cursor`, and `has_more`.
- Categories: `POST /api/v1/categories`, `GET /api/v1/categories`, `PATCH /api/v1/categories/{category_id}`, and `DELETE /api/v1/categories/{category_id}`. Category list supports `kind=income|expense` and the same pagination envelope.
- Transactions: `POST /api/v1/transactions`, `GET /api/v1/transactions`, `GET /api/v1/transactions/{transaction_id}`, `PATCH /api/v1/transactions/{transaction_id}`, and `DELETE /api/v1/transactions/{transaction_id}`. Transaction list supports `limit`, `cursor`, `date_from`, `date_to`, `account_id`, `category_id`, `type=income|expense|transfer_debit|transfer_credit`, and `search`.
- Transfers: `POST /api/v1/transactions/transfers` and `GET /api/v1/transactions/transfers/{transfer_id}`. Cross-currency creation requires `converted_amount`; responses return the linked debit/credit source transaction ids and destination converted currency for auditability.
- Money fields are documented in OpenAPI as decimal strings and are persisted as PostgreSQL `NUMERIC` through Python `Decimal`. Retryable transaction and transfer creates accept `Idempotency-Key`.

## Budget And Savings API Contract Status

Phase 04.4 reviewed the implemented budget and savings contract against the UI needs recorded below.

- Budgets: `POST /api/v1/budgets`, `GET /api/v1/budgets`, `GET /api/v1/budgets/{budget_id}`, `PATCH /api/v1/budgets/{budget_id}`, and `DELETE /api/v1/budgets/{budget_id}`. Budget list supports `limit`, `cursor`, `include_archived`, `category_id`, and `month=YYYY-MM`; responses include `progress.spent_amount`, `progress.remaining_amount`, `progress.percent_used`, and `progress.status`.
- Budget progress is computed from non-voided expense source records using UTC half-open period boundaries. Archived budgets are hidden from default list responses but remain retrievable by id and are available in lists with `include_archived=true`.
- Savings goals: `POST /api/v1/savings-goals`, `GET /api/v1/savings-goals`, `GET /api/v1/savings-goals/{goal_id}`, `PATCH /api/v1/savings-goals/{goal_id}`, and `DELETE /api/v1/savings-goals/{goal_id}`. Goal list supports `limit`, `cursor`, and `status=all|active|completed|archived`; default `all` excludes archived goals.
- Savings contributions: `POST /api/v1/savings-goals/{goal_id}/contributions` and `GET /api/v1/savings-goals/{goal_id}/contributions`. Goal progress is computed from contribution source records, final over-target contributions are allowed, and completed or archived goals reject later contribution creates.
- Budget and savings money fields are documented in OpenAPI as decimal strings. Progress percentages may exceed 100 when a budget is over-spent or a savings goal is over-target.
- Deferred for later report/integration work: `GET /api/v1/budgets/summary`, `GET /api/v1/budgets/setup`, `PUT /api/v1/budgets/setup`, and `GET /api/v1/savings-goals/summary`.

## Report API Contract Status

Phase 05.3 implements the dashboard and analytics report endpoints documented below.

- Dashboard report: implemented at `GET /api/v1/reports/dashboard?period=week|month|year&type=income|expense&as_of=YYYY-MM-DD`. It returns active-account available balance, selected-period income/expense/net-flow totals, and the RootChart bucket series for the selected `period` and transaction `type`.
- Monthly summary report: implemented at `GET /api/v1/reports/monthly-summary?month=YYYY-MM`. It returns analytics summary cards, selected-month savings contributions with month-over-month change, active savings goal count, aggregate budget usage, bounded top-expense cards, and monthly trend card data. Separate top-expense and monthly-trend endpoints are intentionally avoided until the UI needs independent pagination or filtering.
- Cash-flow report: implemented at `GET /api/v1/reports/cash-flow?date_from=<ISO datetime>&date_to=<ISO datetime>&interval=day|week|month`. It returns zero-filled income, expense, and net-flow buckets for line charts such as analytics income-vs-expense.
- Spending-by-category report: implemented at `GET /api/v1/reports/spending-by-category?date_from=<ISO datetime>&date_to=<ISO datetime>`. It returns chart-ready expense category slices with category id/name/icon, amount, and percent.
- Report ranges use UTC half-open semantics: `date_from`/`start_at` is inclusive and `date_to`/`end_at` is exclusive. `month=YYYY-MM` expands to the matching UTC calendar month. Dashboard `week` uses Sunday-start calendar weeks to match the existing chart labels; `month` and `year` use UTC calendar boundaries containing `as_of`, or the current UTC date when `as_of` is omitted.
- Grouping intervals are deterministic: `day` yields one bucket per UTC day, `week` yields one Sunday-start bucket per week, and `month` yields one calendar-month bucket. Empty ranges return zero totals and zero-filled buckets; category and top-expense lists return empty arrays.
- Report money and percent values are serialized as decimal strings from Python `Decimal`. Percentages may be negative for month-over-month change and may exceed 100 for over-budget/over-target values unless a field is explicitly documented as bounded.

## Dashboard And Reports

| Screen | Visible data | Required query | Required mutation | Validation | Loading state | Empty state | Error state |
|---|---|---|---|---|---|---|---|
| `/` home dashboard | Available balance `$2,483.39`, income `$5,000.00`, expense `$2,516.61`, week/month/year bar chart, income/expense chart toggle, recent transaction list | Implemented: `GET /api/v1/reports/dashboard?period=week|month|year&type=income|expense&as_of=YYYY-MM-DD`; existing list endpoint for recents: `GET /api/v1/transactions?limit=6` | None on the page; transaction drawer actions are listed below | Period/type query values must be enum validated; optional `as_of` is a UTC calendar date; report amounts are decimal strings | Summary-card skeletons, chart skeleton, recent-transaction skeleton list | Zero-balance totals, zero-filled chart buckets, and no recent transactions | Retry dashboard report and recent transactions independently |
| `/analytics` | Month selector, savings total `$2,483.39`, month-over-month percentage, income/expense cards, active savings count, budget usage, income-vs-expense chart, spending pie chart, top expenses, monthly trends | Implemented: `GET /api/v1/reports/monthly-summary?month=YYYY-MM`; `GET /api/v1/reports/cash-flow?date_from=<month-start>&date_to=<next-month-start>&interval=day`; `GET /api/v1/reports/spending-by-category?date_from=<month-start>&date_to=<next-month-start>` | None | Month must be a valid month key; UTC date ranges are half-open; chart amounts are decimal strings; month-over-month percentages may be negative and budget/goal percentages may exceed 100 when source records require it | Section-level skeletons for summary, cash-flow chart, spending chart, top expenses, and trends | No activity for selected month; zero summary totals; zero-filled cash-flow chart; empty category/top-expense lists | Retry summary, cash-flow, and spending reports independently |
| `RootChart` component | Server-backed week/month/year buckets with highlighted bars | Included in the documented dashboard report endpoint above | None | Bar labels require deterministic period labels, UTC bucket boundaries, and decimal amount strings | Chart skeleton preserving current height | Zero-filled buckets for selected period | Chart-specific retry or fallback message |
| `IncomeVsExpenseChart` component | Server-backed daily income/expense line data for the selected month | Included in the documented cash-flow report endpoint above with `interval=day` for the selected month | None | Day bucket count must match selected month length; amount strings must parse as decimals | Chart skeleton preserving current height | Zero-filled income and expense buckets for the month | Chart-specific retry or fallback message |
| `SpendingChart` component | Server-backed spending slices by category | Included in the documented spending-by-category report endpoint above | None | Category ids/names/icon keys must map to server categories; values are decimal strings; percent strings derive from total category spending | Chart skeleton preserving current aspect ratio | Empty category list and total amount `0.0000` | Chart-specific retry or fallback message |

## Transactions

| Screen | Visible data | Required query | Required mutation | Validation | Loading state | Empty state | Error state |
|---|---|---|---|---|---|---|---|
| `/transaction` | Search input, type filter, duration filter, date picker, grouped transactions by date, repeated placeholder transactions for Transport/Uber, Salary, Dining, Groceries | `GET /api/v1/transactions?search=&type=income|expense|transfer_debit|transfer_credit&date_from=&date_to=&cursor=&limit=`; UI duration/date filters must translate to `date_from`/`date_to` | Create link should route with real create mode; row drawer delete is `DELETE /api/v1/transactions/{id}` | Search length limit; enum validation for type/date range; UI transfer filter must request both transfer row types or group transfer sides client-side; pagination cursor is opaque | Search/filter controls stay enabled with grouped list skeletons | No transactions for current filters | Retry list load; inline delete error and stale-row recovery |
| `/transaction/[id]` create/edit transaction form | Amount, expense/income tabs, expense category selector, income source selector, date drawer, ignore-budget boolean, recurring boolean, recurrence interval, note | Create mode: `GET /api/v1/categories?kind=expense`, `GET /api/v1/categories?kind=income`; edit mode: `GET /api/v1/transactions/{id}` plus categories; recurring template mode: `GET /api/v1/recurring-rules` and `GET /api/v1/recurring-rules/{rule_id}` | Create one-time transaction: `POST /api/v1/transactions` with `Idempotency-Key`; edit one-time transaction: `PATCH /api/v1/transactions/{id}`; create/edit recurring template: `POST /api/v1/recurring-rules` and `PATCH /api/v1/recurring-rules/{rule_id}`; pause/resume/archive recurring template: `POST /api/v1/recurring-rules/{rule_id}/pause`, `POST /api/v1/recurring-rules/{rule_id}/resume`, `DELETE /api/v1/recurring-rules/{rule_id}` | Amount required and decimal string > 0; category/source required; date required; recurrence interval required only when recurring; recurring templates require timezone-aware start date, optional end date, owned active account/category references, `daily|weekly|monthly|yearly` frequency, and positive interval count; note length limit; ignore-budget only valid for expenses | Form field skeleton for edit mode; category/source drawer loading state | Create has no empty state; edit shows not found for missing transaction or recurring rule; category/source list can be empty with setup copy | Field errors, submit retry, conflict/not-found handling |
| Transaction drawer in `TransactionItem` | Category/source, note, amount, type, hardcoded recurring value `Daily`, time, hardcoded date `12/01/2026`, edit/delete actions | Prefer list payload; optionally `GET /api/v1/transactions/{id}` for fresh details | `DELETE /api/v1/transactions/{id}`; edit navigates to `/transaction/{id}` | Delete confirmation requires id; display must distinguish income, expense, and transfer | Drawer detail skeleton if fetched lazily | Not found if deleted elsewhere | Delete failure message and retry |
| `FilterMenu`, `DateFilter`, `SortBox` | Local type, duration, and date values | Feed transaction list query parameters | None | Type/duration/date enums; empty date clears date filter | Controls show pending state during refetch | Not applicable | Preserve selected filters and show list-level error |
| `categoryIcons` constant | Static category/source icon names for Salary, Business, Investments, Freelance, Refund, Rental, Bonuses, expense categories, Other | `GET /api/v1/categories` includes `icon_key`; milestone 08 must map it to this registry or migrate the registry | Server-side category CRUD exists at `POST/PATCH/DELETE /api/v1/categories`; no category-management UI is wired yet | Category icon keys must fall back cleanly to Other | Not applicable | Missing icon falls back to Other | Missing icon should not break render |

## Budgets

| Screen | Visible data | Required query | Required mutation | Validation | Loading state | Empty state | Error state |
|---|---|---|---|---|---|---|---|
| `/budget` | Month selector, monthly budget, spent, remaining, percent used, and repeated category cards in the active default account currency | Implemented: `GET /api/v1/accounts?include_archived=false`; `GET /api/v1/budgets?month=YYYY-MM`; deferred summary: `GET /api/v1/budgets/summary?month=YYYY-MM` | None on list screen; setup link goes to `/budget/setup` | The overall monthly plan supplies summary limit/spent/remaining when present; category budgets are a fallback only, preventing allocations from being counted twice; expense progress includes only the budget currency | Summary skeleton and category-card skeletons | No budget configured for selected month with setup action | Retry summary/list load |
| `/budget/setup` default allocation form | Monthly income, default tab, allocation summary, fixed category budget inputs, save budget | Implemented dependencies: `GET /api/v1/accounts?include_archived=false`; `GET /api/v1/categories?kind=expense`; `GET /api/v1/budgets?month=YYYY-MM` | Individual budgets are created and updated through the budget CRUD endpoints | Monthly and category budgets use the active default account currency; amounts must be decimal >= 0; category ids must exist | Existing setup skeleton; category list skeleton | No categories available; show category setup guidance | Field validation and submit retry |
| `/budget/setup` custom allocation form | Custom tab, allocation summary, reusable `BudgetInput`, add-category popover from static `EXPENSE_CATEGORY`, save budget | Same as default allocation form | Same as default allocation form | Prevent duplicate categories; slider percentage must stay 0-100; category amount and percentage must reconcile | Same as default allocation form | Empty custom allocation list before categories are added | Field validation and submit retry |
| `BudgetItem` component | Static category name `Vacation Fund`, `$250.00 of $2000.00`, 40% over-budget progress | Included in budgets list endpoint | None | Category name/id, spent, limit, percent, and status required | Card skeleton | No category budgets | Card-level render should tolerate missing optional status |
| `BudgetInput` component | Static category `Housing`, placeholder amount, 20%, slider/progress | Included in setup endpoint | Included in setup mutation | Amount decimal; percent integer 0-100 | Field skeleton or disabled state | No category selected | Field-level validation |

## Savings

| Screen | Visible data | Required query | Required mutation | Validation | Loading state | Empty state | Error state |
|---|---|---|---|---|---|---|---|
| `/savings` | Total savings, active goal count, target total, overall progress, all/active/completed filter, repeated savings goal cards, and account-backed Add Money drawers | Implemented: `GET /api/v1/savings-goals?status=all|active|completed&cursor=&limit=`; `GET /api/v1/accounts?include_archived=false`; deferred summary: `GET /api/v1/savings-goals/summary` | Add Money uses `POST /api/v1/transactions/savings-transfers`; drawer delete is `DELETE /api/v1/savings-goals/{id}` | Add Money requires an active account with the same currency as the goal; the matching default account is preferred, and the selected account is debited atomically with the contribution | Summary skeleton and card-list skeleton | No savings goals with create action; no matching account disables Add Money | Retry summary/list load; inline transfer/delete failure |
| `/savings/[id]` create/edit goal form | Target amount, goal name, selectable currency, monthly saving, note, target date | Create mode also loads `GET /api/v1/accounts?include_archived=false` to resolve the active default account; edit mode: `GET /api/v1/savings-goals/{id}` | Create: `POST /api/v1/savings-goals`; edit: `PATCH /api/v1/savings-goals/{id}` | Currency defaults to the active default account currency but may be changed to a supported currency; target amount required and decimal > 0; name required; monthly saving decimal >= 0; target date optional but if present must be valid future/date; note length limit | Form skeleton while resolving defaults or loading edit data | Create has no empty state; edit not found state | Field validation and submit retry |
| Savings goal drawer in `SavingsItem` | Goal progress, target date, monthly saving, edit, same-currency account selector, add-money form, delete | Uses savings-goal list data plus active accounts loaded by `/savings` | `POST /api/v1/transactions/savings-transfers`; `DELETE /api/v1/savings-goals/{id}` | Account and contribution date required; amount decimal > 0; selected account currency must match goal; note length limit; completed/archived goals reject contributions | Contribution submit spinner | No matching account message with disabled Add Money | Transfer/delete failure states |

## Loans And Debts

| Screen | Visible data | Required query | Required mutation | Validation | Loading state | Empty state | Error state |
|---|---|---|---|---|---|---|---|
| `/loan` | Non-fixture empty/unavailable state | Deferred: loan endpoints do not exist in the current backend contract | None until loan APIs exist | Not applicable until loan APIs exist | Not applicable until loan APIs exist | No loan records available | Not applicable until loan APIs exist |
| `/loan/[id]` create/edit loan form | Non-fixture empty/unavailable state | Deferred: loan endpoints do not exist in the current backend contract | None until loan APIs exist | Not applicable until loan APIs exist | Not applicable until loan APIs exist | No loan record available | Not applicable until loan APIs exist |
| Loan drawer in `LoanItem` | Removed in phase 08.5 because no loan backend exists | Deferred until loan APIs exist | Deferred until loan APIs exist | Deferred until loan APIs exist | Deferred until loan APIs exist | Deferred until loan APIs exist | Deferred until loan APIs exist |
| `FilterLoan` component | Removed in phase 08.5 because no loan backend exists | Deferred until loan APIs exist | None | Deferred until loan APIs exist | Deferred until loan APIs exist | Not applicable | Deferred until loan APIs exist |

## Profile And Auth

| Screen | Visible data | Required query | Required mutation | Validation | Loading state | Empty state | Error state |
|---|---|---|---|---|---|---|---|
| Footer profile sheet | Static avatar skeleton, `Chief Dodson`, `test@example.com`, board links, support/legal/preference buttons, reset password, delete account, logout | `GET /api/v1/users/me`; support/legal content can remain static/deferred | `POST /api/v1/auth/logout`; `DELETE /api/v1/users/me` after confirmation | Authenticated session required for logout/delete; delete requires confirmation | Profile summary skeleton already exists | Anonymous/session-expired state with auth link | Session-expired prompt, retry profile load, logout/delete failure |
| `/profile` | Avatar upload input, name, email, phone, occupation, about me | `GET /api/v1/users/me` | `PATCH /api/v1/users/me`; avatar upload endpoint such as `POST /api/v1/users/me/avatar` using storage adapter | Name required; email valid; phone optional format; occupation enum/free-text decision needed; about length limit; avatar file type/size | Profile form skeleton and avatar upload pending state | Not applicable when authenticated; not found/session expired if user missing | Field validation and save/upload retry |
| `/auth` email entry | Email field, continue button, Google and GitHub buttons | Read-only account destination through `/api/auth/email-route` | Existing email routes to login; unknown email routes to registration; start Google/GitHub OAuth through `/api/auth/oauth/[provider]/start` | Email format required; only supported OAuth providers accepted | Account-check/redirect spinner | Not applicable | Email validation, account-check, or OAuth-start failure |
| `/auth/login` | Email and password | None | `POST /api/v1/auth/login` | Email format; password required | Submit spinner | Not applicable | Invalid credentials, locked/rate-limited, field errors |
| `/auth/register` | Email registration fields, or OAuth-provided full name and read-only email | OAuth registration preview through `/api/auth/oauth/preview` | Email registration through `/api/auth/register`; explicit OAuth account creation through `/api/auth/oauth/register` | Email form fields and password policy; OAuth full name required and opaque ticket required | Preview and submit spinners | Not applicable | Duplicate email, expired OAuth ticket, validation errors, rate limit |
| `/auth/oauth/callback` | OAuth completion/loading or provider error | None; consumes the provider result from the URL fragment | Existing account: `/api/auth/oauth/exchange` then Home; new account: hold the opaque registration ticket in session storage, redirect to `/auth/register?oauth=1`, then Home after explicit creation | Provider and one-time exchange code validated | Callback spinner | Not applicable | Provider denial, expired/invalid code or ticket, session failure |
| `/auth/forgot-password` | Email form, send code, 4-digit code input, confirm | None | `POST /api/v1/auth/password-reset/request`; `POST /api/v1/auth/password-reset/verify` | Email valid; code exactly 4 digits; throttling and expiry | Submit spinners for both forms | Not applicable | Invalid email/code, expired code, resend failure |
| `/auth/recover-password` | New password, confirm password, login button label | None; token/code validation may be server-side on submit | `POST /api/v1/auth/password-reset/confirm` | Password policy; confirm password match; reset token/code required from prior step | Submit spinner | Not applicable | Expired token/code, validation errors |

## Shared Navigation, Layout, And Constants

| Surface | Visible data | Required query | Required mutation | Validation | Loading state | Empty state | Error state |
|---|---|---|---|---|---|---|---|
| Dashboard layout and footer navigation | Main routes `/`, `/analytics`, `/transaction`, `/loan`, profile sheet trigger | None | None | Route highlighting should match current pathname | Not applicable | Not applicable | Not applicable |
| Header and back button | Page title, optional home icon, router back button | None | None | Navigation target must exist | Not applicable | Not applicable | Not applicable |
| `imageConstant` | Static auth/social icons | None | None | Asset imports must exist | Not applicable | Not applicable | Broken asset fallback if needed |
| shadcn/Radix UI primitives | Buttons, fields, inputs, sheets, drawers, popovers, dialogs, tabs, select, calendar, chart wrappers | None directly | None directly | Component-level accessibility and form-state props should be wired by feature components | Skeleton components already exist | Not applicable | Feature components provide errors |

## Fixture And Hardcoded Value Replacement List

Milestone 08 must replace these runtime placeholders with server-backed data or explicit static/deferred content.

| File | Placeholder / fixture content |
|---|---|
| `client/app/(dashboard)/page.tsx` | Balance, income/expense totals, recent transactions |
| `client/components/charts/RootChart.tsx` | `weekData`, `monthData`, `yearData`, income/expense and period local state |
| `client/app/(dashboard)/analytics/page.tsx` | `MONTHS`, savings summary, income/expense totals, active goals, budget percent, top expenses, monthly trends |
| `client/components/charts/IncomeVsExpenseChart.tsx` | Static daily income/expense `Days` chart data |
| `client/components/charts/SpendingChart.tsx` | Static spending pie data |
| `client/app/(dashboard)/transaction/page.tsx` | Repeated date groups and transaction examples |
| `client/app/(dashboard)/transaction/[id]/page.tsx` | Static `EXPENSE_CATEGORY`, `INCOME_SOURCE`, `RECURRENCE_OPTIONS`; create/edit mode is inferred only from route segment |
| `client/components/items/TransactionItem.tsx` | Hardcoded recurring value, date, `/transaction/edit` link, delete action without id |
| `client/app/(dashboard)/budget/page.tsx` | `MONTHS`, monthly budget totals, spent/remaining/progress/day counts, repeated budget cards |
| `client/app/(dashboard)/budget/setup/page.tsx` | Static `EXPENSE_CATEGORY`, default allocation categories, totals, allocation percentages |
| `client/components/items/BudgetItem.tsx` | Static category/card values |
| `client/components/inputs/BudgetInput.tsx` | Static Housing label, amount placeholder, percentage, slider/progress state |
| `client/app/(dashboard)/savings/page.tsx` | Savings totals, active goal count, target total, progress, repeated goal cards |
| `client/app/(dashboard)/savings/[id]/page.tsx` | Create/edit goal placeholders and generic route behavior |
| `client/components/items/SavingsItem.tsx` | Static goal details, `/savings/edit` link, add-money title, delete action without id |
| `client/app/(dashboard)/loan/page.tsx` | Lent/borrowed totals, repeated loan cards |
| `client/app/(dashboard)/loan/[id]/page.tsx` | Create/edit loan placeholders and generic route behavior |
| `client/components/items/LoanItem.tsx` | Static counterparty, amounts, dates, `/loan/edit` link, delete action without id |
| `client/components/Footer.tsx` | Static profile name/email and nonfunctional support/preferences/delete/logout buttons |
| `client/app/(dashboard)/profile/page.tsx` | Profile placeholders and occupation options |
| `client/app/auth/page.tsx` | Email-first submit without handler; visual social auth buttons |
| `client/app/auth/login/page.tsx` | Login form without handler; commented field errors |
| `client/app/auth/register/page.tsx` | Register form without handler; occupation options; commented field errors |
| `client/app/auth/forgot-password/page.tsx` | Reset request/verification forms without handlers |
| `client/app/auth/recover-password/page.tsx` | Password recovery form without handler |
| `client/lib/categoryIcons.ts` | Static icon registry for category names |

## UI Gaps To Add During Integration

- Generated OpenAPI contracts and typed API helpers exist from milestone 08; keep new integration code on those helpers.
- Add server-state loading, empty, error, and retry states for every query-backed screen.
- Wire form state, submit handlers, client validation, server validation display, and disabled/pending states.
- Replace generic create/edit links such as `/transaction/create`, `/transaction/edit`, `/savings/create`, `/savings/edit`, `/loan/create`, and `/loan/edit` with route behavior that passes a real mode or record id.
- Give drawer actions real record ids and mutation handlers.
- Preserve visual layout and component styling while adding data behavior.
- Keep support/legal content, settings, receipt upload, notifications, and SSE
  out of MVP UI integration unless a later phase explicitly scopes them.
- When a later integration phase scopes notifications, consume
  `GET /api/v1/notifications/stream` with authenticated `fetch` streaming,
  listen for `notification.snapshot` and `notification.created` hints, refetch
  the notification list/unread-count REST endpoints for source-of-truth state,
  tolerate `heartbeat` keepalives, and reconnect after the advertised SSE
  retry interval. Do not add WebSockets for this UI surface.

## Phase 08.5 Fixture And Resilience Update

- Analytics now consumes `GET /api/v1/reports/monthly-summary`, `GET /api/v1/reports/cash-flow`, and `GET /api/v1/reports/spending-by-category` at runtime. The previous static month list, summary cards, top expenses, trends, and chart data were removed.
- `IncomeVsExpenseChart` and `SpendingChart` now render caller-provided report data rather than embedded chart fixtures.
- Loan/debt runtime fixture cards, filters, drawer items, and create/edit forms were removed because the backend has no loan endpoints. The loan routes now show a non-fixture unavailable/empty state until a later phase implements the loan contract.
- Deleted unused runtime fixture-only components: `client/components/items/LoanItem.tsx`, `client/components/filters/FilterLoan.tsx`, and `client/components/inputs/BudgetInput.tsx`.
- Runtime searches for recorded finance fixture names and hardcoded finance dollar values under `client/app`, `client/components`, and `client/lib` returned no matches after phase 08.5.
