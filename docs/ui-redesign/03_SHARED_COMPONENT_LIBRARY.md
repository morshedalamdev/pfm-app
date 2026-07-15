# UI Redesign Agent 03 - Shared UI Component Library

## Reference Files

All expected read-only reference files are present under `ref-ui/` and were inspected:

- `IMG-01.jpeg` - general component language: soft surfaces, icon containers, compact finance hierarchy, bottom navigation context, transaction rows, report rows, and goal cards.
- `IMG-02.jpeg` - financial summary proportions, transaction-row hierarchy, segmented controls, report spacing, and right-aligned values.
- `IMG-03.jpeg` - chart-card containment, donut center content, tooltip treatment, rounded chart segments, and muted segment treatment.
- `IMG-04.jpeg` - savings goal card structure, progress hierarchy, remaining amount placement, warning footer, and context action placement.
- `IMG-05.jpeg` - dense report category rows with icon surfaces, amount hierarchy, change badges, and thin progress tracks.
- `IMG-06.jpeg` - income and expense metric cards, semantic icon surfaces, large amount typography, and high-contrast action-banner direction.

The reference files remain outside production code and public assets. No sample balances, sample identities, sample branding, `Get Pro` upsells, or reference image assets should be copied into the app.

## Existing Component Inventory

Current shared component areas:

- `client/components/ui/`: shadcn/Radix/Vaul primitives for buttons, cards, dialogs, drawers, sheets, dropdowns, popovers, progress, skeletons, tables, tabs, form fields, inputs, labels, select, native select, sliders, calendar, command, chart, and alert dialog.
- `client/components/shell/`: Agent 02 authenticated shell, desktop/tablet sidebar, and top bar.
- `client/components/theme/`: Agent 01 `ThemeProvider`, `useTheme`, and `ThemeSelector`.
- `client/components/items/`: `HeaderItem`, `TransactionItem`, `BudgetItem`, `SavingsItem`, and `LoanItem`.
- `client/components/charts/`: dashboard bar chart, income-vs-expense chart, and spending chart wrappers.
- `client/components/filters/`: transaction duration/type filter, loan direction filter, date filter, and sort box.
- `client/components/inputs/`: `TransactionInput`, an older drawer-based form control used by transaction create/edit.
- `client/components/accounts/`: `AccountTypeIcon`.
- `client/components/recurring/`: recurring reminder provider and recurring confirmation popups.
- `client/components/Header.tsx`, `BackBtn.tsx`, and `Footer.tsx`: route header, back button, and mobile navigation host.

Current reusable finance utilities:

- `client/lib/finance/format.ts`: `formatMoney`, `formatPercent`, date/month helpers, and decimal input normalization.
- `client/lib/finance/accounts.ts`: account label, active/default-account, account-money, select-option, and delete/disable/default helpers.
- `client/lib/finance/accountTypes.ts` and `client/lib/finance/currencies.ts`: display metadata.
- `client/lib/categoryIcons.ts`: category icon mapping.

Authenticated pages inspected:

- Dashboard, analytics, transactions, transaction detail/create, accounts, account create, budget, budget setup, savings, savings detail/create, loan, loan detail/create, settings, and profile under `client/app/(dashboard)/`.

## Duplicate Pattern Inventory

Repeated component patterns found:

- Finance metric cards: `HeaderItem`, dashboard balance section, budget monthly summary, accounts total/active tiles, loan due summary, analytics income/expense cards, and account detail tiles.
- Card surfaces: repeated `rounded-md` or `rounded-lg` plus `border border-input` or `bg-secondary/70` across budget, analytics, accounts, savings, loan, transaction, and detail dialogs.
- Icon containers: repeated secondary icon buttons or local icon boxes in transaction rows, budget rows, account rows, report rows, and reference-aligned cards.
- Money rendering: `formatMoney` is used broadly, but components format directly rather than using a shared money display component with tabular numerals, compact/full variants, wrapping rules, or accessible labels.
- Progress rendering: page and item components repeatedly use `Progress value={Math.min(value, 100)}` while showing true values separately.
- Status pills: account active/default pills exist page-locally; budget status uses local text and red/green classes; loan overdue is local; transaction type styling is local.
- State UI: loading, empty, error, and retry states are repeated as plain paragraphs or ad hoc bordered blocks across dashboard, budget, transaction, accounts, loan, savings, and analytics.
- Overlays: dialogs, drawers, alert dialogs, nested drawers, and confirmation patterns are used directly in pages and item components with repeated destructive wording and local error display.
- Filtering controls: transaction filters, loan filters, date filter, and month pickers repeat dropdown/popover/command patterns.
- Search fields: transaction and loan search inputs use local `InputGroup` arrangements.
- Chart containers: `RootChart`, `IncomeVsExpenseChart`, `SpendingChart`, and `ui/chart.tsx` share Recharts foundations but do not yet expose reusable chart cards, loading, empty, or error containers.
- Form fields: `Field`, `FieldLabel`, `FieldError`, `InputGroup`, and `TransactionInput` coexist, with page-local label/error behavior in budget setup, savings contribution, loans, account create, and transaction forms.

## Existing Primitive Inventory

Keep Agent 01 and Agent 02 foundations as dependencies:

- Agent 01 tokens and runtime: `client/app/globals.css`, `client/lib/theme.ts`, `client/lib/theme-script.ts`, `ThemeProvider`, `useTheme`, and `ThemeSelector`.
- Agent 02 shell and navigation: `AuthenticatedAppShell`, `AppSidebar`, `AppTopBar`, `Footer`, and `client/lib/navigation.ts`.

Existing primitive status:

- `Button`: keep and extend through composition. It already centralizes variants and icon sizing.
- `Card`: extend or wrap. It is token-aware but page code rarely uses it for financial cards.
- `Progress`: replace or wrap for finance progress. It does not clamp internally, has no built-in semantic variants, and does not expose true over-limit values.
- `Skeleton`: extend through state components. Current usage is ad hoc.
- `Dialog`, `Drawer`, `Sheet`, `AlertDialog`, `DropdownMenu`, `Popover`, `Command`, `Select`, `Tabs`, `Table`: keep unchanged as low-level primitives and wrap for app-level patterns.
- `ChartContainer`, `ChartTooltipContent`, `ChartLegendContent`: extend. They provide useful Recharts integration but need chart token cleanup, reusable containers, and accessible empty/loading states.
- `Field`, `InputGroup`, `Input`, `Textarea`, `NativeSelect`, `Select`, `Calendar`: keep and wrap into finance-safe form controls.

## Keep / Extend / Replace Classification

| Component or area | Classification | Notes |
| --- | --- | --- |
| `client/app/globals.css` Agent 01 tokens | Keep unchanged | Do not create a second theme system. Use semantic tokens in future shared components. |
| `ThemeProvider`, `ThemeSelector`, `useTheme` | Keep unchanged | Agent 03 should only consume this runtime. |
| `AuthenticatedAppShell`, `AppSidebar`, `AppTopBar`, `Footer`, `client/lib/navigation.ts` | Keep unchanged | Agent 03 must fit inside the shell and avoid rebuilding navigation. |
| `client/components/ui/button.tsx` | Extend | Good foundation for icon/text actions; shared components should compose it. |
| `client/components/ui/card.tsx` | Wrap | Use as a base for `CardSurface` and finance cards without changing low-level API abruptly. |
| `client/components/ui/progress.tsx` | Replace or wrap | Needs clamping, labels, semantic variants, over-limit handling, and reduced-motion-safe behavior. |
| `client/components/ui/skeleton.tsx` | Extend | Build `CardSkeleton`, `ListSkeleton`, and page/card loading states on top of it. |
| `client/components/ui/chart.tsx` | Extend | Remove white axis tick assumption later; add chart card/header/legend/tooltip/empty/loading wrappers. |
| `HeaderItem` | Merge | Current metric-card seed should become `FinancialMetricCard` or be deprecated after replacement. |
| `TransactionItem` | Replace | It mixes transaction row, drawer details, delete confirmation, hardcoded income/transfer colors, and default fallback copy. |
| `BudgetItem` | Replace | It is a good row seed but uses local status copy/color and local progress clamping. |
| `SavingsItem` | Replace | It combines goal card, details drawer, add-money form, account filtering, and delete confirmation. |
| `LoanItem` | Replace | It combines card display, overdue calculation, settlement history fetch, settlement form, drawer, and delete confirmation. |
| Account list/detail local components in `accounts/page.tsx` | Extract later | Strong source for `AccountCard`, `StatusBadge`, detail tiles, and confirmation patterns, but currently API/page-state coupled. |
| `TransactionInput` | Replace | It is drawer-based and hardcodes black/white selected states; use shared form controls and app drawer wrappers instead. |
| `FilterMenu`, `FilterLoan`, `DateFilter`, `SortBox` | Wrap or merge | Build generic filter/date/sort controls with typed options and accessible labels. |
| `RootChart`, `IncomeVsExpenseChart`, `SpendingChart` | Page-specific and defer | Keep route chart behavior, but create shared chart containers before migrating pages. |
| Recurring popups | Page-specific and defer | Preserve behavior; later wrap confirmation/dialog state only if safe. |

No component should be removed in this phase. Later removals require known usages, verified replacements, passing tests, and documentation.

## Theme Risks

- Several components still use hardcoded utility colors such as `text-green-500`, `text-blue-500`, `text-red-500`, `text-green-400`, `text-red-400`, `text-black`, `text-white`, `bg-black`, and `bg-white/10`.
- `TransactionInput` calendar and drawer choices use `text-black`, `bg-black`, and `text-white`, which are not theme-safe in dark mode.
- `RootChart` uses `from-black`, `fill-white`, and white skeleton styling.
- `ui/chart.tsx` forces Recharts axis tick text to white, which conflicts with light theme chart tokens.
- Recurring income dialog uses emerald-specific classes and hardcoded shadow color.
- Many page cards use `bg-secondary/70`, `border-input`, and `text-input` directly; this may remain acceptable short-term but should move toward surface, muted, and semantic finance tokens.

## Responsive Risks

- The Agent 02 shell intentionally keeps legacy content at `max-w-md`; shared components must support narrow containers now and wider containers later.
- Several pages still use calculated mobile heights such as `h-[calc(100%-320px)]`, `h-[calc(100%-6.5rem)]`, and `pb-[70px]`.
- Item components rely on `flex flex-wrap` and `line-clamp-1`; large money values, long account names, and long category names may collide or compress right-aligned values.
- Summary sections use two-column grids without a shared responsive-grid primitive.
- Drawer and dialog content often uses `100svh` or `100dvh` calculations locally; future overlay wrappers should handle safe mobile height and nested scrolling consistently.

## Accessibility Risks

- `TransactionItem`, `BudgetItem`, `SavingsItem`, and `LoanItem` use non-button `div` elements as drawer triggers in several places, so keyboard activation and semantics are inconsistent.
- Some icon buttons lack explicit accessible labels when icon-only.
- Status meaning sometimes relies on color plus short text, but not a reusable semantic status contract.
- `Progress` usage often lacks explicit accessible labels or value descriptions.
- Empty/loading/error states are often plain paragraphs without consistent roles or retry semantics.
- Confirmation dialogs repeat destructive wording and button variants locally; focus restoration depends on low-level Radix/Vaul behavior but is not wrapped in an app-level contract.

## Financial Data Display Risks

- `formatMoney` safely supports multiple currency codes and the CNY symbol override, but components still manually control wrapping, sign display, compact formatting, and accessibility.
- `formatMoney` converts string values through `Number`, which is acceptable for display but can lose precision for very large decimal strings; shared display components should preserve display expectations and avoid business calculations.
- `TransactionItem` prepends signs based on type and formats transfer debit/credit locally.
- Progress values are often clamped before passing to `Progress`; true over-limit values are displayed inconsistently.
- Zero-target and divide-by-zero handling is page-local in budget totals and loan settlement percent logic.
- Account, savings, loan, transaction, and report rows need shared long-name and large-amount behavior.
- Multiple currencies can appear in transaction and account lists, but row layout does not yet reserve stable space for long three-letter currency displays or high-value amounts.

## Planned Component Organization

Planned structure for later phases, aligned with current repository conventions:

```text
client/components/ui/
client/components/finance/
client/components/states/
client/components/forms/
client/components/data-display/
client/components/overlays/
client/lib/finance/
```

Expected categories:

- Surface/layout: `CardSurface`, `SectionHeader`, `PageSection`, `ResponsiveGrid`, `Stack`, `InlineGroup`, `Divider`, `IconContainer`.
- Financial values: `MoneyValue`, `PercentageValue`, `ChangeIndicator`, `FinancialMetric`, `FinancialMetricCard`, `FinancialSummaryCard`.
- Status/progress: `StatusBadge`, `ChangeBadge`, `AccountTypeBadge`, `TransactionTypeBadge`, `ProgressStatus`, `LinearProgress`, `CircularProgress`, `GoalProgress`, `BudgetProgress`, `ProgressLegend`.
- Finance rows/cards: `AccountCard`, `TransactionRow`, `BudgetProgressRow`, `SavingsGoalCard`, `LoanDebtCard`, `ReportCategoryRow`, `UpcomingCommitmentRow`.
- Charts: `ChartCard`, `ChartHeader`, `ChartLegend`, `ChartTooltipContent`, `ChartEmptyState`, `ChartLoadingState`.
- States: `CardSkeleton`, `ListSkeleton`, `PageLoadingState`, `EmptyState`, `ErrorState`, `InlineError`, `AlertBanner`.
- Forms: shared label/error/input wrappers, `MoneyInput`, `SearchInput`, `SelectField`, `DateField`, `SegmentedControl`, `ToggleField`.
- Data controls: `FilterBar`, `FilterChip`, `FilterButton`, `SearchAndFilterHeader`, `SortControl`, `DateRangeControl`, `Pagination`, `ResponsiveDataList`, and a table wrapper.
- Overlays: app-level dialog, drawer, sheet, confirmation, destructive confirmation, action menu, and context menu wrappers on top of existing Radix/Vaul primitives.

## Planned Files to Change

Later Agent 03 phases may create or modify:

- `client/components/finance/*`
- `client/components/states/*`
- `client/components/forms/*`
- `client/components/data-display/*`
- `client/components/overlays/*`
- Select low-level wrappers under `client/components/ui/` only when needed.
- Focused Playwright fixtures under `client/e2e/`.
- `docs/ui-redesign/03_SHARED_COMPONENT_LIBRARY.md`
- `docs/ui-redesign/03_SHARED_COMPONENT_LIBRARY_TEST_REPORT.md`
- `PFM_PROJECT_STATE.md`

Existing pages should only receive minimal integration changes after shared components exist. Complete page redesign remains deferred to later page agents.

## Blockers

- No Agent 03 implementation blocker was found in Phase 03.1.
- Agent 01 is complete with a documented full-suite E2E blocker unrelated to theme primitives.
- Agent 02 is complete with focused shell/navigation coverage and the same documented full-suite E2E blocker.
- Phase 03.1 reproduced the existing full-suite E2E blocker in `integrated finance journeys render across breakpoints`: the recurring expense warning dialog did not show the expected `Groceries` text within the assertion timeout. This phase changed documentation and project state only, so no production UI repair was made.
- The local sandbox may block production build font fetches, local server binding, and full E2E unless approved outside the sandbox.
- `client/package.json` still has no real `lint` or unit `test` scripts; `npm run lint --if-present` and `npm run test --if-present` are expected no-ops.

## Deferred Page-Level Migration

Do not redesign complete feature pages in Agent 03. Defer full migration of:

- Dashboard balance, metric cards, chart section, and recent transactions.
- Analytics summary, charts, report category rows, and monthly trend rows.
- Transaction list filters, transaction rows, and transaction create/edit form flow.
- Account list, account create, and account detail dialog.
- Budget overview, budget setup, and budget progress rows.
- Savings list cards, add-money flow, and savings detail/create form.
- Loan/debt list cards, people drawer, settlement history, and loan detail/create form.
- Settings, profile, and auth page content.

Phase 03.1 changed documentation only and did not change production UI behavior.

## Phase 03.2 Component Contracts

Phase 03.2 adds reusable financial primitives under `client/components/finance/`.
They are presentation-only components: they do not fetch data, mutate state,
convert currencies, or encode page-specific business rules.

### Surface and Layout

- `CardSurface`: token-aware card wrapper with `default`, `subtle`, `elevated`,
  and `outline` variants. Supports `selected`, `disabled`, `interactive`, and
  `asChild` composition for callers that need a real button or link. Keyboard
  focus styles only apply when the caller provides an interactive child.
- `SectionHeader`: compact responsive heading block with optional eyebrow,
  description, and action slot. Long titles and descriptions wrap safely.
- `IconContainer`: fixed-size semantic icon surface using Agent 01 tone tokens.
  Icons are decorative by default unless an `aria-label` is supplied.

### Financial Values

- `MoneyValue`: renders existing `formatMoney` output by default and keeps the
  existing CNY `¥` behavior. It adds compact display, sign-display policy,
  tabular numerals, semantic tone, and optional accessible labels. It does not
  convert currencies.
- `PercentageValue`: renders existing `formatPercent` output with tabular
  numerals, sign-display policy, semantic tone, and optional accessible labels.
- `ChangeIndicator`: displays positive, negative, and zero change with an icon,
  text value, and semantic tone.
- `ChangeBadge`: wraps `ChangeIndicator` in a semantic soft badge.

### Status and Progress

- `StatusBadge`: covers common neutral, active, disabled, pending, on-track,
  near-limit, over-budget, overdue, behind, completed, and archived statuses
  with text plus icon so meaning is not color-only.
- `LinearProgress`: uses accessible `role="progressbar"` semantics, clamps the
  visual fill between 0 and 100, and preserves true over-limit or zero-target
  values through visible text and `aria-valuetext`.
- `CircularProgress`: mirrors the linear progress contract for compact radial
  displays, including visual clamping and true value text.
- `ProgressLegend`: provides reusable semantic swatches and optional values for
  chart or progress explanations.

### Edge-Case Handling

Verified or covered by implementation contracts:

- Negative, zero, positive, very large, compact, and CNY money values.
- `0%`, `100%`, and values above `100%`.
- Zero-target and disabled progress states through labels and reduced opacity.
- Long labels through truncation or wrapping at component boundaries.
- Theme-safe light/dark styles through Agent 01 tokens.
- Reduced-motion behavior through `motion-reduce:transition-none`.
- Keyboard focus only through `CardSurface asChild` when an interactive child is
  supplied by the caller.

### Preview Strategy

`client/app/component-preview/page.tsx` is a development-only route for
focused component verification. It calls `notFound()` in production and does
not expose a public component gallery. The route renders the edge cases needed
by `client/e2e/shared-components.e2e.spec.mjs` across light/dark and
mobile/desktop viewports.

## Phase 03.2 Changed Files

- `client/components/finance/tokens.ts`
- `client/components/finance/layout.tsx`
- `client/components/finance/values.tsx`
- `client/components/finance/status.tsx`
- `client/components/finance/progress.tsx`
- `client/components/finance/index.ts`
- `client/app/component-preview/page.tsx`
- `client/e2e/shared-components.e2e.spec.mjs`

## Phase 03.3 Component Contracts

Phase 03.3 adds reusable financial data-display components on top of the
Phase 03.2 primitives. These components remain presentation-only and expect
callers to pass already-loaded data, display status, and calculated metrics.

### Financial Cards

- `FinancialMetricCard`: title, amount, icon, semantic tone, optional trend,
  supporting text, compact variant, and standard variant.
- `FinancialSummaryCard`: summary amount, title/subtitle, optional icon,
  action slot, status slot, and labelled supporting facts.
- `AccountCard`: account name, type, currency, balance, optional percentage of
  total, recent activity, default/disabled/archived badges, and context action
  slot. It does not implement account deletion or disable rules.
- `SavingsGoalCard`: goal name, saved/target/remaining values, progress,
  target date, expected completion, required contribution, status, and action
  slot. Schedule status must be calculated by callers.
- `LoanDebtCard`: person, given/taken direction, original/outstanding amount,
  currency, account label, repay date, progress, status, and action slot.
  Overdue logic remains outside the card.
- `UpcomingCommitmentRow`: compact upcoming payment/reminder row with icon,
  title, date/description, amount, and status.

### Financial Rows

- `TransactionRow`: category icon, description, account, date, tags, amount,
  income/expense/transfer tones, optional action, and selected state. It does
  not resolve categories or accounts.
- `BudgetProgressRow`: category, spent, limit, remaining, percentage, status,
  and accessible progress. It does not calculate budget progress from
  transactions.
- `ReportCategoryRow`: category, amount, percentage, period comparison, icon,
  and progress.

### Chart Containers

- `ChartCard`: title/header slot, responsive height, accessible summary,
  loading, empty, error, and content states without page queries.
- `ChartHeader`: title, subtitle, period-control slot, and chart-type-control
  slot.
- `ChartLegend`: semantic chart legend with optional values.
- `ChartTooltipContent`: finance-layer export of the existing Recharts tooltip
  content for chart consumers.
- `ChartLoadingState` and `ChartEmptyState`: reusable chart states.

### Phase 03.3 Verification

The development-only `client/app/component-preview/page.tsx` now renders all
Phase 03.2 and 03.3 primitives for focused browser coverage. The Playwright
spec verifies light and dark themes, mobile and desktop widths, long labels,
large values, selected and disabled states, missing optional fields, loading
and empty chart states, accessible progress labels, no horizontal overflow, and
keyboard focus for interactive slots.

## Phase 03.3 Changed Files

- `client/components/finance/cards.tsx`
- `client/components/finance/rows.tsx`
- `client/components/finance/charts.tsx`
- `client/components/finance/index.ts`
- `client/app/component-preview/page.tsx`
- `client/e2e/shared-components.e2e.spec.mjs`

## Phase 03.4 Component Contracts

Phase 03.4 adds shared interaction and state components for later page
redesign agents. These components do not call APIs, own payload transforms, or
introduce a form library.

### State UI

- `PageLoadingState`, `CardSkeleton`, and `ListSkeleton`: theme-safe loading
  placeholders with no fake financial data and reduced-motion-safe animation.
- `EmptyState` and `ErrorState`: action-capable states with semantic roles and
  explicit retry support.
- `InlineError`, `AlertBanner`, `SuccessBanner`, and `WarningBanner`: reusable
  semantic message components.

### Forms

- `FormField`, `FieldLabel`, `FieldDescription`, and `FieldError`: label,
  description, and error association helpers.
- `TextInput`, `MoneyInput`, `SearchInput`, `SelectField`, `DateField`,
  `TextareaField`, `SegmentedControl`, and `ToggleField`: callback-driven form
  controls preserving native keyboard behavior and the global mobile 16px input
  rule. Validation and payload behavior stay with callers.

### Filtering and Data Controls

- `FilterBar`, `FilterChip`, `FilterButton`, `SearchAndFilterHeader`,
  `SortControl`, `DateRangeControl`, `Pagination`, `ResponsiveDataList`, and
  `Tabs`: responsive, keyboard-accessible controls with callback-driven state
  and no API logic.

### Overlays

- `AppDialog`, `AppDrawer`, and `AppSheet`: app-level wrappers around existing
  Radix/Vaul primitives with title/description/content/action slots,
  scrollable content, shell z-index alignment, and mobile safe-area padding.
- `ConfirmDialog` and `DestructiveConfirmDialog`: alert-dialog wrappers with
  destructive confirmation semantics delegated through explicit callbacks.
- `ActionMenu` and `ContextMenu`: dropdown-based action wrappers using the
  existing menu primitive.

### Phase 03.4 Verification

The development-only preview includes labels, descriptions, invalid fields,
search, active filters, filter reset, segmented controls, tabs, pagination,
states, banners, dialog, drawer, sheet, confirm dialog, destructive dialog, and
action menu coverage. Focused Playwright verifies screen-reader labels,
keyboard interaction, focus restoration, Escape-key close, disabled states,
error states, mobile/desktop layout, and no horizontal overflow.

The required full E2E suite was also attempted for Phase 03.4. It reproduced
the existing baseline blocker in `integrated finance journeys render across
breakpoints`: the recurring warning dialog did not show the expected
`Groceries` text before the assertion timeout. No production repair was made
because this phase only added shared interaction primitives.

## Phase 03.4 Changed Files

- `client/components/finance/states.tsx`
- `client/components/finance/forms.tsx`
- `client/components/finance/controls.tsx`
- `client/components/finance/overlays.tsx`
- `client/components/finance/index.ts`
- `client/app/component-preview/interaction-preview.tsx`
- `client/app/component-preview/page.tsx`
- `client/e2e/shared-components.e2e.spec.mjs`
