# UI API Matrix

This matrix records the current Next.js UI surface and the API contract it implies. All visible finance data is currently placeholder data. Loading, empty, and error states are mostly absent and must be added when each screen is connected to server data.

## Dashboard And Reports

| Screen | Visible data | Read endpoints | Mutations | Loading state | Empty state | Error state |
| --- | --- | --- | --- | --- | --- | --- |
| `/` Home dashboard | Available balance, income total, expense total, week/month/year income or expense chart, recent transactions | `GET /api/v1/reports/dashboard?period=...`, `GET /api/v1/transactions?limit=...` | None on screen; transaction drawer links to edit/delete actions | Dashboard skeleton for totals, chart, and recent list | Zero-balance summary and no recent transactions message | Retry panel for summary/list failures |
| `/analytics` | Month selector, savings total and trend, income/expenses totals, active savings goals count, budget usage, income vs expense chart, spending by category chart, top expenses, monthly trends | `GET /api/v1/reports/monthly-summary?month=...`, `GET /api/v1/reports/income-expense?month=...`, `GET /api/v1/reports/spending-by-category?month=...`, `GET /api/v1/reports/top-expenses?month=...`, `GET /api/v1/reports/monthly-trends?month=...` | None | Section skeletons for totals, cards, charts, and lists | No activity for selected month | Retry state per failed report section |

## Transactions

| Screen | Visible data | Read endpoints | Mutations | Loading state | Empty state | Error state |
| --- | --- | --- | --- | --- | --- | --- |
| `/transaction` | Search input, type filter, duration filter, date filter, grouped transactions by day, transaction drawer details | `GET /api/v1/transactions?search=&type=&duration=&date=&cursor=...` | Drawer delete: `DELETE /api/v1/transactions/{id}` | List skeleton grouped by date | No transactions for current filters | Retry list load; inline delete failure |
| `/transaction/[id]` used as create/edit form | Amount, expense/income tabs, category/source, date, ignore budgets, recurring flag, recurrence interval, note | Create needs `GET /api/v1/categories?type=...`; edit needs `GET /api/v1/transactions/{id}` and categories | Create: `POST /api/v1/transactions`; edit: `PATCH /api/v1/transactions/{id}` | Form field skeleton for edit mode | Not applicable for create; not found for missing edit record | Field validation errors and submit retry |
| Transaction drawer | Category/source, note, amount, type, recurring interval, time/date | Data should come from list item or `GET /api/v1/transactions/{id}` | `DELETE /api/v1/transactions/{id}` and edit navigation | Drawer detail skeleton if fetched lazily | Not found if transaction was deleted elsewhere | Delete confirmation failure |

## Budgets

| Screen | Visible data | Read endpoints | Mutations | Loading state | Empty state | Error state |
| --- | --- | --- | --- | --- | --- | --- |
| `/budget` | Month selector, monthly budget amount, spent, remaining, percent used, days remaining, budget category cards with spent/limit/progress/over-budget state | `GET /api/v1/budgets/summary?month=...`, `GET /api/v1/budgets?month=...` | None on list screen | Budget summary and category skeletons | No budget configured for selected month with setup link | Retry summary/list load |
| `/budget/setup` | Monthly income, default/custom tabs, allocation summary, category budget inputs, add category popover, save budget | `GET /api/v1/categories?type=expense`, `GET /api/v1/budgets/setup?month=...` | `PUT /api/v1/budgets/setup` | Form skeleton for existing setup | Empty custom allocation list before categories are added | Field validation and submit retry |

## Savings

| Screen | Visible data | Read endpoints | Mutations | Loading state | Empty state | Error state |
| --- | --- | --- | --- | --- | --- | --- |
| `/savings` | Total savings, active goal count, target total, overall progress, all/active/completed filter, goal cards | `GET /api/v1/savings-goals/summary`, `GET /api/v1/savings-goals?status=...` | Goal drawer delete: `DELETE /api/v1/savings-goals/{id}` | Summary and card skeletons | No savings goals with create link | Retry summary/list load; inline delete failure |
| `/savings/[id]` used as create/edit form | Target amount, goal name, monthly saving, note, target date | Edit needs `GET /api/v1/savings-goals/{id}` | Create: `POST /api/v1/savings-goals`; edit: `PATCH /api/v1/savings-goals/{id}` | Form skeleton for edit mode | Not applicable for create; not found for missing edit record | Field validation and submit retry |
| Savings goal drawer | Goal name, progress, current/target amount, target date, monthly saving, add-money form with date/amount/note, delete | Data should come from list item or `GET /api/v1/savings-goals/{id}` | `POST /api/v1/savings-goals/{id}/contributions`, `DELETE /api/v1/savings-goals/{id}` | Drawer detail skeleton if fetched lazily | Not found if goal was deleted elsewhere | Contribution/delete failure states |

## Loans And Debts

| Screen | Visible data | Read endpoints | Mutations | Loading state | Empty state | Error state |
| --- | --- | --- | --- | --- | --- | --- |
| `/loan` | Lent out total, borrowed total, search, lent/borrowed filter, loan cards with contact, amount, total, repaid progress, lent/due dates | `GET /api/v1/loans/summary`, `GET /api/v1/loans?search=&type=...` | Drawer delete: `DELETE /api/v1/loans/{id}` | Summary and card skeletons | No loans/debts for current filter | Retry summary/list load; inline delete failure |
| `/loan/[id]` used as create/edit form | Amount, lent/borrowed switch, counterparty name, optional phone, lent date, due date, note | Edit needs `GET /api/v1/loans/{id}` | Create: `POST /api/v1/loans`; edit: `PATCH /api/v1/loans/{id}` | Form skeleton for edit mode | Not applicable for create; not found for missing edit record | Field validation and submit retry |
| Loan drawer | Lent/borrowed detail, counterparty, outstanding/current amount, original total, start date, due date | Data should come from list item or `GET /api/v1/loans/{id}` | `DELETE /api/v1/loans/{id}`; future repayment mutation `POST /api/v1/loans/{id}/payments` | Drawer detail skeleton if fetched lazily | Not found if loan was deleted elsewhere | Delete/payment failure states |

## Profile And Auth

| Screen | Visible data | Read endpoints | Mutations | Loading state | Empty state | Error state |
| --- | --- | --- | --- | --- | --- | --- |
| Footer profile sheet | Avatar skeleton, display name, email, board links, support/preference links, logout, delete account | `GET /api/v1/users/me` | `POST /api/v1/auth/logout`, `DELETE /api/v1/users/me` after confirmation | Avatar/profile skeleton already visible | Minimal anonymous state if no session | Session-expired prompt or retry |
| `/profile` | Avatar upload, name, email, phone, occupation, about me | `GET /api/v1/users/me` | `PATCH /api/v1/users/me`, avatar upload through future receipts/storage-style adapter path | Profile form skeleton | Not applicable once authenticated | Field validation and save retry |
| `/auth` | Email-first welcome form and social buttons | None initially | MVP local flow can route to login/register lookup; social OAuth is deferred | Button spinner | Not applicable | Email validation and lookup failure |
| `/auth/login` | Email and password | None | `POST /api/v1/auth/login` | Submit spinner | Not applicable | Invalid credentials and field validation |
| `/auth/register` | Name, occupation, phone, email, password, confirm password | None | `POST /api/v1/auth/register` | Submit spinner | Not applicable | Duplicate email and field validation |
| `/auth/forgot-password` | Email form and 4-digit code entry | None | `POST /api/v1/auth/password-reset/request`, `POST /api/v1/auth/password-reset/verify` | Submit spinners for both steps | Not applicable | Invalid email/code and resend failure |
| `/auth/recover-password` | New password and confirm password | None | `POST /api/v1/auth/password-reset/confirm` | Submit spinner | Not applicable | Expired token/code and field validation |

## Shared UI Gaps To Preserve For Later Milestones

- There is no active API helper, generated client, Zustand store, or server-state query layer yet.
- The visible routes use placeholder data and local component state.
- Several links use dynamic placeholder paths such as `/transaction/create`, `/transaction/edit`, `/savings/create`, `/savings/edit`, `/loan/create`, and `/loan/edit`; the current `[id]` pages render generic create/edit forms.
- Social auth buttons are present visually but remain outside MVP backend scope unless explicitly approved.
- Receipts, notifications, and SSE have no current UI screen, but remain in the backend architecture for later milestones.
