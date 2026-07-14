# Agent 01 - Website Design System and Theme Foundation

## Reference Files

All expected files were present under `ref-ui/` and inspected as read-only references:

- `IMG-01.jpeg`
- `IMG-02.jpeg`
- `IMG-03.jpeg`
- `IMG-04.jpeg`
- `IMG-05.jpeg`
- `IMG-06.jpeg`

No reference image was renamed, moved, optimized, converted, imported into the app, copied into `public`, or used as production content.

## Visual Direction

The references establish a soft, premium finance UI language with:

- Purple-led brand emphasis and restrained glow for primary actions.
- Light surfaces, rounded sections, minimal borders, and subtle depth.
- Large financial values with compact supporting hierarchy.
- Clear income, expense, progress, warning, and chart semantics.
- Segmented chart colors using purple, blue, green, orange, and muted remainder treatment.
- Compact analytical rows with icon surfaces, right-aligned values, progress tracks, and small comparison badges.

The references are directional only. Later phases must not copy sample balances, fake insight copy, `Get Pro`, profile photos, mobile bottom navigation, or mathematically inconsistent sample values.

## Existing Theme Baseline

`client/app/globals.css` already contains the main Tailwind CSS 4 theme foundation:

- `@import "tailwindcss"`
- `@import "tw-animate-css"`
- `@custom-variant dark (&:is(.dark *))`
- `@theme inline` mappings for shadcn-style color tokens.
- `:root` token values for background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart, and sidebar colors.
- `.dark` token overrides for the same core and chart/sidebar tokens.
- Radius mappings from a root `--radius`.
- A custom default font family set to `Urbanist`.
- Custom breakpoints and spacing.
- A global `x-animation` utility.

Important baseline issue: the current default `:root` values are effectively dark-first, with `--background: oklch(0% 0 0)` and `--foreground: oklch(1 0 0)`. Phase 01.2 should turn the default into a true light theme and keep `.dark` as the dark override.

## Existing Theme Runtime

No production theme runtime currently exists.

- No theme provider was found.
- No theme hook was found.
- No theme preference storage was found.
- No `matchMedia("(prefers-color-scheme: dark)")` usage was found.
- No System/Light/Dark preference model was found.
- No root `<html>` `.dark` boot script was found.
- No color-scheme assignment was found.

Existing browser storage is limited to auth tokens in `client/lib/auth/tokenStorage.ts` under `pfm.auth.tokens`.

`client/app/layout.tsx` uses `next/font/google` for Urbanist, loads `/runtime-config.js` with `strategy="beforeInteractive"`, renders a decorative global ellipse image, and sets `suppressHydrationWarning` on `<body>`. Phase 01.3 should avoid using broad hydration suppression as a way to hide theme mismatches.

## Existing Token Inventory

Current global tokens:

- Core: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`.
- Charts: `--chart-1` through `--chart-5`.
- Sidebar: `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`.
- Radius: `--radius`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-2xl`, `--radius-3xl`, `--radius-4xl`.
- Miscellaneous: `--spacing`, `--breakpoint-xx`, `--breakpoint-xs`, `--text-xx`, `--color-icon`.

Missing semantic token families needed by later phases:

- Surface levels: `surface`, `surface-subtle`, `surface-elevated`, `surface-overlay`.
- Brand states: `primary-hover`, `primary-active`, `primary-soft`, `primary-soft-foreground`, `primary-border`, `primary-glow`.
- Finance semantics: `income`, `expense`, `saving`, `debt`, `success`, `warning`, `destructive-soft`, `info` and their soft/foreground companions.
- Chart support: `chart-muted`, `chart-track`, `chart-grid`, `chart-axis`, `chart-tooltip`, `chart-tooltip-foreground`.
- Navigation aliases beyond sidebar.
- Typography, motion, and shadow tokens.

## Existing Chart Color Inventory

Global chart variables exist in both `:root` and `.dark`, but they are not yet aligned to the supplied purple/blue/green/orange/coral palette.

Chart usage found:

- `client/app/(dashboard)/analytics/page.tsx` maps spending slices to `var(--chart-1)` through `var(--chart-5)`.
- `client/components/charts/IncomeVsExpenseChart.tsx` defines config colors as `var(--chart-1)` and `var(--chart-2)`, but the rendered line strokes use `var(--color-income)` and `var(--color-expense)`, which are not currently defined by the global token map.
- `client/components/charts/RootChart.tsx` uses literal OKLCH fills and a hardcoded black-to-accent gradient.
- `client/components/charts/SpendingChart.tsx` consumes per-item `fill` values from page data.
- `client/components/ui/chart.tsx` injects chart CSS for light and dark selectors but also hardcodes Recharts axis tick text to white.

## Existing Typography and Spacing

- Urbanist is configured through `next/font/google` in `client/app/layout.tsx`.
- Global font family is mapped in `client/app/globals.css` as `--default-font-family: 'Urbanist', sans-serif`.
- No local theme typography scale exists beyond Tailwind classes and `--text-xx`.
- Financial amount typography is page/component-specific and does not yet use a shared numeric utility.
- Global `body` is constrained to `max-w-md`, keeping the app mobile-width on desktop.
- The root `main` uses `h-svh`; many pages and footer/sheet surfaces rely on `svh` and bottom padding.
- Mobile inputs, selects, and textareas are globally set to `16px` below `768px` to preserve browser zoom behavior.

Existing spacing/radius/shadow patterns are mostly direct Tailwind utilities:

- Frequent `p-3`, `px-3`, `py-1.5`, `gap-1.5`, `gap-3`, `rounded-md`, `rounded-xl`, `rounded-3xl`, `shadow-sm`, `shadow-xs`.
- No semantic spacing, shadow, or motion token layer exists yet.

## Hardcoded Style Migration Inventory

### Global Blockers

- `client/app/globals.css`: default `:root` is dark-first rather than a true light theme.
- `client/app/layout.tsx`: `suppressHydrationWarning` is applied to `<body>` before any theme runtime exists.
- `client/components/ui/chart.tsx`: chart wrapper hardcodes Recharts axis tick text to white.
- `client/components/charts/IncomeVsExpenseChart.tsx`: rendered line colors reference undefined `--color-income` and `--color-expense`.

### Shared Component Blockers

- `client/components/Footer.tsx`: footer uses `from-black`, active `text-white`, `bg-icon`, and board active `text-white bg-icon/20`.
- `client/components/charts/RootChart.tsx`: chart panel uses `from-black`, `border-white`, `fill-white`, hardcoded OKLCH fills, and muted text through `text-input`.
- `client/components/recurring/RecurringIncomeAchievementPopup.tsx`: success styling is emerald-specific and should later move to success/income semantic tokens while preserving its income achievement behavior.
- `client/components/items/TransactionItem.tsx`: income and transfer amounts use `text-green-500` and `text-blue-500`.
- `client/components/items/BudgetItem.tsx`: budget status uses `text-red-500` and `text-green-500`.

### Page-Level Migration Work

- `client/app/(dashboard)/budget/setup/page.tsx`: remaining amount states use `text-red-500` and `text-green-500`.
- `client/app/(dashboard)/analytics/page.tsx`: savings trend uses `text-green-400` and `text-red-400`.
- `client/components/filters/SortBox.tsx`: dropdown affordance uses `text-stone-400`.
- Page layout surfaces use many direct `bg-secondary`, `bg-accent`, `bg-background`, `border-input`, and gradient combinations that should be evaluated route by route by later UI agents.

### Safe to Defer

- Page-specific layout dimensions and mobile-width shell behavior.
- Existing page content hierarchy, forms, drawers, and business workflows.
- Existing recurring popup behavior, account behavior, currency behavior, savings/budget/loan calculations, and API contracts.

## Global Blockers

- No System/Light/Dark runtime exists.
- No persistent theme preference exists.
- No pre-paint theme boot exists.
- No `color-scheme` handling exists.
- Default `:root` tokens are not a production light theme.
- Undefined finance semantic CSS variables are referenced by `IncomeVsExpenseChart`.
- `client/app/(dashboard)/settings` exists as an empty directory in this worktree; the phase brief's expected `client/app/(dashboard)/settings/page.tsx` was not found.

## Shared Component Blockers

- Shared chart primitives need theme-safe axis, tooltip, track, and semantic finance colors.
- Footer/nav surfaces need navigation tokens rather than black/white/icon hardcoding.
- Shared finance row components need income/expense/transfer/success/warning/destructive semantic classes.
- Recurring income popup needs semantic success/income tokens in a later phase, not page-specific emerald utilities.

## Deferred Page-Level Work

Later page agents should migrate:

- Dashboard card and chart styling.
- Analytics summary, chart, and row styling.
- Transaction rows and filters.
- Account list and create surfaces.
- Budget and budget setup styling.
- Savings cards and contribution UI.
- Loan/debt cards, overdue states, and settlement UI.
- Authentication pages.
- Profile page.

No page redesign was performed in Phase 01.1.

## Planned Files to Change

Expected future Agent 01 phases may change or add:

- `client/app/globals.css`
- `client/app/layout.tsx`
- Theme utility files under `client/lib/`
- Theme provider/hook components under `client/components/`
- A reusable theme selector component.
- The actual settings page file once the current route structure is reconciled.
- Focused theme Playwright checks when practical.
- `docs/ui-redesign/01_DESIGN_SYSTEM_THEME_FOUNDATION.md`
- `docs/ui-redesign/01_DESIGN_SYSTEM_THEME_TEST_REPORT.md`
- `PFM_PROJECT_STATE.md`

## Blockers

- `/settings` implementation mismatch: `client/app/(dashboard)/settings` exists but has no `page.tsx` in this worktree, while required docs and Agent 01 later phases expect a Settings page for the theme selector.
- Production build may require network approval because `next/font/google` fetches the existing Urbanist font.
- Optional `lint` and unit `test` scripts are not defined in `client/package.json`.
