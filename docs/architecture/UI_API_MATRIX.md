# UI API Matrix

Phase 00.2 inspected the implemented Next.js routes, data-bearing components, charts, filters, drawers, forms, constants, and helper files under `client/app`, `client/components`, and `client/lib`. The UI currently has no API helper, generated client, server-state cache, Zustand store, or repository-owned tests. All finance/profile/auth data shown in the app is local placeholder data or uncontrolled form input.

## Finance Core API Contract Status

Phase 03.6 reviewed the implemented finance core contract against the UI needs recorded below. Account, category, transaction, and transfer APIs are available under `/api/v1`; reports, budgets, savings goals, loans, profile mutation, and frontend integration remain later milestone work.

- Accounts: `POST /api/v1/accounts`, `GET /api/v1/accounts`, `GET /api/v1/accounts/{account_id}`, `PATCH /api/v1/accounts/{account_id}`, and `DELETE /api/v1/accounts/{account_id}`. List responses use `items`, `next_cursor`, and `has_more`.
- Categories: `POST /api/v1/categories`, `GET /api/v1/categories`, `PATCH /api/v1/categories/{category_id}`, and `DELETE /api/v1/categories/{category_id}`. Category list supports `kind=income|expense` and the same pagination envelope.
- Transactions: `POST /api/v1/transactions`, `GET /api/v1/transactions`, `GET /api/v1/transactions/{transaction_id}`, `PATCH /api/v1/transactions/{transaction_id}`, and `DELETE /api/v1/transactions/{transaction_id}`. Transaction list supports `limit`, `cursor`, `date_from`, `date_to`, `account_id`, `category_id`, `type=income|expense|transfer_debit|transfer_credit`, and `search`.
- Transfers: `POST /api/v1/transactions/transfers` and `GET /api/v1/transactions/transfers/{transfer_id}`. Transfer creation returns linked debit/credit source transaction ids for auditability.
- Money fields are documented in OpenAPI as decimal strings and are persisted as PostgreSQL `NUMERIC` through Python `Decimal`. Retryable transaction and transfer creates accept `Idempotency-Key`.

## Dashboard And Reports

| Screen | Visible data | Required query | Required mutation | Validation | Loading state | Empty state | Error state |
|---|---|---|---|---|---|---|---|
| `/` home dashboard | Available balance `$2,483.39`, income `$5,000.00`, expense `$2,516.61`, week/month/year bar chart, income/expense chart toggle, recent transaction list | `GET /api/v1/reports/dashboard?period=week|month|year&type=income|expense`; `GET /api/v1/transactions?limit=6` | None on the page; transaction drawer actions are listed below | Period/type query values must be enum validated; report amounts are decimal strings | Summary-card skeletons, chart skeleton, recent-transaction skeleton list | Zero-balance totals and no recent transactions | Retry dashboard summary and recent transactions independently |
| `/analytics` | Month selector, savings total `$2,483.39`, month-over-month percentage, income/expense cards, active savings count, budget usage, income-vs-expense chart, spending pie chart, top expenses, monthly trends | `GET /api/v1/reports/monthly-summary?month=YYYY-MM`; `GET /api/v1/reports/income-expense?month=YYYY-MM`; `GET /api/v1/reports/spending-by-category?month=YYYY-MM`; `GET /api/v1/reports/top-expenses?month=YYYY-MM`; `GET /api/v1/reports/monthly-trends?month=YYYY-MM` | None | Month must be a valid month key; chart amounts are decimal strings; percentages are bounded 0-100 unless trends explicitly allow negative/over-100 | Section-level skeletons for summary, charts, top expenses, and trends | No activity for selected month; empty charts with neutral copy | Retry per failed report section |
| `RootChart` component | Static `weekData`, `monthData`, `yearData` arrays with highlighted bars | Included in dashboard report endpoint above | None | Bar labels require period labels and decimal amount strings | Chart skeleton preserving current height | No data for selected period | Chart-specific retry or fallback message |
| `IncomeVsExpenseChart` component | Static daily income/expense line data for days 1-30 | Included in analytics report endpoint above | None | Day values must match selected month length; amount strings must parse as decimals | Chart skeleton preserving current height | No income or expenses for month | Chart-specific retry or fallback message |
| `SpendingChart` component | Static pie data: Food, Housing, Transport, Entertainment, Others | Included in analytics spending endpoint above | None | Category ids/names must map to server categories; values are decimal strings | Chart skeleton preserving current aspect ratio | No spending by category | Chart-specific retry or fallback message |

## Transactions

| Screen | Visible data | Required query | Required mutation | Validation | Loading state | Empty state | Error state |
|---|---|---|---|---|---|---|---|
| `/transaction` | Search input, type filter, duration filter, date picker, grouped transactions by date, repeated placeholder transactions for Transport/Uber, Salary, Dining, Groceries | `GET /api/v1/transactions?search=&type=income|expense|transfer_debit|transfer_credit&date_from=&date_to=&cursor=&limit=`; UI duration/date filters must translate to `date_from`/`date_to` | Create link should route with real create mode; row drawer delete is `DELETE /api/v1/transactions/{id}` | Search length limit; enum validation for type/date range; UI transfer filter must request both transfer row types or group transfer sides client-side; pagination cursor is opaque | Search/filter controls stay enabled with grouped list skeletons | No transactions for current filters | Retry list load; inline delete error and stale-row recovery |
| `/transaction/[id]` create/edit transaction form | Amount, expense/income tabs, expense category selector, income source selector, date drawer, ignore-budget boolean, recurring boolean, recurrence interval, note | Create mode: `GET /api/v1/categories?kind=expense`, `GET /api/v1/categories?kind=income`; edit mode: `GET /api/v1/transactions/{id}` plus categories | Create: `POST /api/v1/transactions` with `Idempotency-Key`; edit: `PATCH /api/v1/transactions/{id}` | Amount required and decimal string > 0; category/source required; date required; recurrence interval required only when recurring; note length limit; ignore-budget only valid for expenses | Form field skeleton for edit mode; category/source drawer loading state | Create has no empty state; edit shows not found for missing transaction; category/source list can be empty with setup copy | Field errors, submit retry, conflict/not-found handling |
| Transaction drawer in `TransactionItem` | Category/source, note, amount, type, hardcoded recurring value `Daily`, time, hardcoded date `12/01/2026`, edit/delete actions | Prefer list payload; optionally `GET /api/v1/transactions/{id}` for fresh details | `DELETE /api/v1/transactions/{id}`; edit navigates to `/transaction/{id}` | Delete confirmation requires id; display must distinguish income, expense, and transfer | Drawer detail skeleton if fetched lazily | Not found if deleted elsewhere | Delete failure message and retry |
| `FilterMenu`, `DateFilter`, `SortBox` | Local type, duration, and date values | Feed transaction list query parameters | None | Type/duration/date enums; empty date clears date filter | Controls show pending state during refetch | Not applicable | Preserve selected filters and show list-level error |
| `categoryIcons` constant | Static category/source icon names for Salary, Business, Investments, Freelance, Rental, Bonuses, expense categories, Other | `GET /api/v1/categories` includes `icon_key`; milestone 08 must map it to this registry or migrate the registry | Server-side category CRUD exists at `POST/PATCH/DELETE /api/v1/categories`; no category-management UI is wired yet | Category icon keys must fall back cleanly to Other | Not applicable | Missing icon falls back to Other | Missing icon should not break render |

## Budgets

| Screen | Visible data | Required query | Required mutation | Validation | Loading state | Empty state | Error state |
|---|---|---|---|---|---|---|---|
| `/budget` | Month selector, monthly budget `$2,483.39`, spent `$2100.00`, remaining `$1400.00`, percent used, days remaining, repeated category cards | `GET /api/v1/budgets/summary?month=YYYY-MM`; `GET /api/v1/budgets?month=YYYY-MM` | None on list screen; setup link goes to `/budget/setup` | Month key is required; budget amounts are decimal strings; progress percentage may exceed 100 for over-budget display | Summary skeleton and category-card skeletons | No budget configured for selected month with setup action | Retry summary/list load |
| `/budget/setup` default allocation form | Monthly income, default tab, allocation summary, fixed category budget inputs, save budget | `GET /api/v1/categories?kind=expense`; `GET /api/v1/budgets/setup?month=YYYY-MM` | `PUT /api/v1/budgets/setup` | Monthly income required and decimal >= 0; category allocations decimal >= 0; total allocated cannot exceed income unless the product explicitly allows it; category ids must exist | Existing setup skeleton; category list skeleton | No categories available; show category setup guidance | Field validation and submit retry |
| `/budget/setup` custom allocation form | Custom tab, allocation summary, reusable `BudgetInput`, add-category popover from static `EXPENSE_CATEGORY`, save budget | Same as default allocation form | Same as default allocation form | Prevent duplicate categories; slider percentage must stay 0-100; category amount and percentage must reconcile | Same as default allocation form | Empty custom allocation list before categories are added | Field validation and submit retry |
| `BudgetItem` component | Static category name `Vacation Fund`, `$250.00 of $2000.00`, 40% over-budget progress | Included in budgets list endpoint | None | Category name/id, spent, limit, percent, and status required | Card skeleton | No category budgets | Card-level render should tolerate missing optional status |
| `BudgetInput` component | Static category `Housing`, placeholder amount, 20%, slider/progress | Included in setup endpoint | Included in setup mutation | Amount decimal; percent integer 0-100 | Field skeleton or disabled state | No category selected | Field-level validation |

## Savings

| Screen | Visible data | Required query | Required mutation | Validation | Loading state | Empty state | Error state |
|---|---|---|---|---|---|---|---|
| `/savings` | Total savings `$2,483.39`, active goal count, target total `$7,500.00`, overall progress, all/active/completed filter, repeated savings goal cards | `GET /api/v1/savings-goals/summary`; `GET /api/v1/savings-goals?status=all|active|completed&cursor=&limit=` | Create link should route with real create mode; drawer delete is `DELETE /api/v1/savings-goals/{id}` | Status enum; progress percentage bounded except over-target display; amounts decimal strings | Summary skeleton and card-list skeleton | No savings goals with create action | Retry summary/list load; inline delete failure |
| `/savings/[id]` create/edit goal form | Target amount, goal name, monthly saving, note, target date | Edit mode: `GET /api/v1/savings-goals/{id}` | Create: `POST /api/v1/savings-goals`; edit: `PATCH /api/v1/savings-goals/{id}` | Target amount required and decimal > 0; name required; monthly saving decimal >= 0; target date optional but if present must be valid future/date; note length limit | Form skeleton for edit mode | Create has no empty state; edit not found state | Field validation and submit retry |
| Savings goal drawer in `SavingsItem` | Static `Vacation Fund`, current `$250.00`, target `$2000.00`, progress, target date, monthly saving, edit, add-money form, delete | Prefer list payload; optionally `GET /api/v1/savings-goals/{id}` for fresh details | `POST /api/v1/savings-goals/{id}/contributions`; `DELETE /api/v1/savings-goals/{id}` | Contribution date required; amount decimal > 0; note length limit; cannot mutate deleted/completed goal unless allowed | Drawer detail skeleton if fetched lazily; contribution submit spinner | Not found if goal was deleted elsewhere | Contribution/delete failure states |

## Loans And Debts

| Screen | Visible data | Required query | Required mutation | Validation | Loading state | Empty state | Error state |
|---|---|---|---|---|---|---|---|
| `/loan` | Lent out total `$12,500`, borrowed total `$3,200`, search, lent/borrowed filter, repeated loan cards | `GET /api/v1/loans/summary`; `GET /api/v1/loans?search=&type=all|lent|borrowed&cursor=&limit=` | Create link should route with real create mode; drawer delete is `DELETE /api/v1/loans/{id}` | Search length limit; type enum; amount fields decimal strings | Summary skeleton and card-list skeleton | No loans/debts for current filter with create action | Retry summary/list load; inline delete failure |
| `/loan/[id]` create/edit loan form | Amount, lent/borrowed switch, counterparty name, optional phone, lent date, due date, note | Edit mode: `GET /api/v1/loans/{id}` | Create: `POST /api/v1/loans`; edit: `PATCH /api/v1/loans/{id}` | Amount decimal > 0; type enum; counterparty required; phone optional with length/format limit; lent date required; due date optional but not before lent date; note length limit | Form skeleton for edit mode | Create has no empty state; edit not found state | Field validation and submit retry |
| Loan drawer in `LoanItem` | Static counterparty names `Mike Johnson` / `John Doe`, lent/borrowed wording, current amount, total amount, progress, start/due dates, edit/delete | Prefer list payload; optionally `GET /api/v1/loans/{id}` for fresh details | `DELETE /api/v1/loans/{id}`; future repayment action should be `POST /api/v1/loans/{id}/payments` when the UI adds it | Delete requires id; repayment amount decimal > 0 when implemented | Drawer detail skeleton if fetched lazily | Not found if loan was deleted elsewhere | Delete/payment failure states |
| `FilterLoan` component | Local all/lent/borrowed filter | Feeds loan list query parameter | None | Type enum | Control pending state during refetch | Not applicable | Preserve selected filter and show list-level error |

## Profile And Auth

| Screen | Visible data | Required query | Required mutation | Validation | Loading state | Empty state | Error state |
|---|---|---|---|---|---|---|---|
| Footer profile sheet | Static avatar skeleton, `Chief Dodson`, `test@example.com`, board links, support/legal/preference buttons, reset password, delete account, logout | `GET /api/v1/users/me`; support/legal content can remain static/deferred | `POST /api/v1/auth/logout`; `DELETE /api/v1/users/me` after confirmation | Authenticated session required for logout/delete; delete requires confirmation | Profile summary skeleton already exists | Anonymous/session-expired state with auth link | Session-expired prompt, retry profile load, logout/delete failure |
| `/profile` | Avatar upload input, name, email, phone, occupation, about me | `GET /api/v1/users/me` | `PATCH /api/v1/users/me`; avatar upload endpoint such as `POST /api/v1/users/me/avatar` using storage adapter | Name required; email valid; phone optional format; occupation enum/free-text decision needed; about length limit; avatar file type/size | Profile form skeleton and avatar upload pending state | Not applicable when authenticated; not found/session expired if user missing | Field validation and save/upload retry |
| `/auth` email entry | Email field, continue button, Google/Facebook/Apple buttons | None initially; optional `GET /api/v1/auth/email-status?email=` if email-first routing is retained | Local MVP can route to login/register; OAuth buttons are deferred | Email format required | Submit spinner | Not applicable | Email validation/lookup failure |
| `/auth/login` | Email and password | None | `POST /api/v1/auth/login` | Email format; password required | Submit spinner | Not applicable | Invalid credentials, locked/rate-limited, field errors |
| `/auth/register` | Name, occupation, phone, email, password, confirm password | None | `POST /api/v1/auth/register` | Name required; occupation valid; phone optional format; email valid; password policy; confirm password match | Submit spinner | Not applicable | Duplicate email, validation errors, rate limit |
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

- Add a generated or typed API layer; none exists today.
- Add server-state loading, empty, error, and retry states for every query-backed screen.
- Wire form state, submit handlers, client validation, server validation display, and disabled/pending states.
- Replace generic create/edit links such as `/transaction/create`, `/transaction/edit`, `/savings/create`, `/savings/edit`, `/loan/create`, and `/loan/edit` with route behavior that passes a real mode or record id.
- Give drawer actions real record ids and mutation handlers.
- Preserve visual layout and component styling while adding data behavior.
- Keep social OAuth, support/legal content, settings, receipt upload, notifications, and SSE out of MVP UI integration unless a later phase explicitly scopes them.
