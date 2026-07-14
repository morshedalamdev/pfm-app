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

Phase 01.1 found no production theme runtime.

- No theme provider was found.
- No theme hook was found.
- No theme preference storage was found.
- No `matchMedia("(prefers-color-scheme: dark)")` usage was found.
- No System/Light/Dark preference model was found.
- No root `<html>` `.dark` boot script was found.
- No color-scheme assignment was found.

Existing browser storage is limited to auth tokens in `client/lib/auth/tokenStorage.ts` under `pfm.auth.tokens`.

`client/app/layout.tsx` uses `next/font/google` for Urbanist, loads `/runtime-config.js` with `strategy="beforeInteractive"`, renders a decorative global ellipse image, and sets `suppressHydrationWarning` on `<body>`. Phase 01.3 should avoid using broad hydration suppression as a way to hide theme mismatches.

Phase 01.3 adds the production runtime described in `Theme Runtime` and `Theme Persistence` below.

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

## Token Architecture

Phase 01.2 replaced the dark-first root palette with a true light default theme and an intentional `.dark` override while preserving the existing Tailwind CSS 4 and shadcn/Radix-compatible token names.

Core compatibility tokens retained:

- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`
- `--border`, `--input`, `--ring`
- `--chart-1` through `--chart-5`
- `--sidebar-*`

New semantic tokens added:

- Surfaces: `--surface`, `--surface-subtle`, `--surface-elevated`, `--surface-overlay`
- Borders and controls: `--border-strong`, `--input-background`, `--focus`
- Brand states: `--primary-hover`, `--primary-active`, `--primary-soft`, `--primary-soft-foreground`, `--primary-border`, `--primary-glow`
- Finance semantics: `--income`, `--expense`, `--saving`, `--debt`, `--success`, `--warning`, `--info` plus soft and foreground companions
- Destructive support: `--destructive-soft`, `--destructive-foreground`
- Charts: `--chart-muted`, `--chart-track`, `--chart-grid`, `--chart-axis`, `--chart-tooltip`, `--chart-tooltip-foreground`
- Navigation: `--navigation-background`, `--navigation-foreground`, `--navigation-active`, `--navigation-muted`
- Elevation/motion/typography foundations: `--shadow-floating`, `--shadow-primary-glow`, `--duration-fast`, `--duration-normal`, `--duration-slow`, `--ease-standard`, `--ease-emphasized`, and semantic typography size variables

The `@theme inline` map now exposes the new color families to Tailwind as `--color-*` variables. Existing `bg-icon` usage remains compatible and now resolves to the primary brand token.

## Light Theme

The default `:root` theme is now a light theme:

- Page background: near-white with a subtle cool tint.
- Foreground: dark neutral with enough contrast for body text.
- Cards/popovers: white elevated surfaces.
- Brand: purple primary with hover, active, soft, border, and glow states.
- Borders/inputs: visible neutral boundaries that remain soft against white cards.
- Financial semantics: income/success green, expense/destructive coral-red, saving blue, debt amber, warning amber, info blue.
- Chart palette: purple, blue, green, orange, and coral-red with separate muted, track, grid, axis, and tooltip tokens.

## Dark Theme

The `.dark` theme remains compatible with Tailwind dark variants and now has intentionally designed values:

- Page background: deep neutral-purple, not pure black.
- Cards/popovers: elevated dark surfaces with border contrast.
- Brand: brighter purple for dark-surface contrast.
- Soft semantic states: darker tinted surfaces with readable foreground companions.
- Chart colors: lifted chroma and lightness so slices remain visible on dark cards.
- Shadows: stronger neutral floating shadow with controlled purple glow only for branded emphasis.

Phase 01.2 does not add runtime theme selection, so `.dark` still requires Phase 01.3 to be applied to `<html>`.

## Financial Semantic Colors

Token meanings:

- `income`: positive incoming money.
- `expense`: outgoing spending.
- `saving`: savings progress or contribution.
- `debt`: loan/debt responsibility.
- `success`: completed action.
- `warning`: approaching limit or schedule risk.
- `destructive`: error, deletion, overdue, or severe overspending.
- `info`: neutral guidance.

Each semantic group has a base color, a soft surface, and a foreground color. Later page agents should migrate hardcoded `text-green-*`, `text-red-*`, `text-blue-*`, and emerald popup styling to these semantic tokens.

## Chart Colors

Chart foundations now include:

- `chart-1`: purple
- `chart-2`: blue
- `chart-3`: green
- `chart-4`: orange
- `chart-5`: coral/red-orange
- `chart-muted`: unallocated or secondary segment
- `chart-track`: progress or donut track
- `chart-grid`: chart grid lines
- `chart-axis`: axis text/marks
- `chart-tooltip` and `chart-tooltip-foreground`: tooltip surface/text

The current report components were not redesigned in this phase. Later chart work should use these tokens and preserve non-color cues such as labels, tooltips, and legends.

## Typography

The existing Urbanist integration is preserved. Phase 01.2 adds semantic size variables for:

- Display balance
- Page title
- Section title
- Card title
- Body
- Supporting text
- Label
- Caption

Later phases should add a shared financial-number utility with tabular numerals when applying typography to components. No component font sizes were mass-changed in this phase.

## Spacing

The existing Tailwind spacing foundation remains intact. Phase 01.2 does not alter page spacing or route layouts.

Recommended later usage:

- Page padding should stay compact in the current mobile-width shell.
- Repeated financial cards should use consistent internal padding and list row gaps.
- Inline actions should keep small predictable gaps.
- Desktop expansion, if introduced by later agents, should be handled by shell/page redesign phases, not by this token phase.

## Radius

The root radius increased from `0.625rem` to `0.75rem`, preserving the existing derived Tailwind radius scale:

- `--radius-sm`
- `--radius-md`
- `--radius-lg`
- `--radius-xl`
- `--radius-2xl`
- `--radius-3xl`
- `--radius-4xl`

This keeps buttons and inputs moderately rounded while allowing cards and financial sections to feel closer to the references.

## Shadows

Phase 01.2 adds:

- `--shadow-floating`: neutral elevated surface shadow.
- `--shadow-primary-glow`: controlled purple emphasis shadow.

These tokens are not applied broadly yet. Ordinary cards should avoid glow; purple glow is reserved for branded selected states, primary floating actions, or high-emphasis interactions in later phases.

## Motion

Phase 01.2 adds motion foundations:

- `--duration-fast`
- `--duration-normal`
- `--duration-slow`
- `--ease-standard`
- `--ease-emphasized`

The existing `x-animation` utility remains unchanged. Reduced-motion handling and theme-transition suppression belong to later global foundation/runtime phases.

Phase 01.3 adds a first-boot transition guard through `html[data-theme-booting="true"]`.

## Theme Runtime

Phase 01.3 adds:

- `client/lib/theme.ts`
- `client/lib/theme-script.ts`
- `client/components/theme/ThemeProvider.tsx`
- Root layout wiring in `client/app/layout.tsx`

Runtime behavior:

- The inline `pfm-theme-init` script runs with `strategy="beforeInteractive"`.
- The script reads the saved preference before visible React application paint when the browser allows it.
- The script resolves `system` through `prefers-color-scheme: dark`.
- The script applies or removes `.dark` on `<html>`.
- The script sets `document.documentElement.style.colorScheme`.
- The script writes `data-theme` and `data-theme-preference` attributes for diagnostics and later selectors.
- The script ignores invalid stored values and falls back to `system`.
- Storage and media-query reads are guarded with `try/catch`.
- `ThemeProvider` rehydrates the current preference on the client and keeps `<html>` synchronized after hydration.
- `ThemeProvider` listens to OS theme changes only while the selected preference is `system`.

`suppressHydrationWarning` moved from `<body>` to `<html>` because the pre-paint script intentionally mutates the root class and attributes before React hydrates. This suppression is limited to the root element that the theme boot script owns.

## Theme Persistence

Theme preference storage:

- Key: `pfm.ui.theme`
- Values: `system`, `light`, `dark`
- Invalid value behavior: ignored and treated as `system`
- Storage unavailable behavior: application still loads and resolves as `system`

The stored preference and resolved theme remain separate concepts:

- `system` resolves from `prefers-color-scheme`.
- `light` always resolves to light.
- `dark` always resolves to dark.

Theme preference is not stored in auth tokens, finance state, URL parameters, cookies, backend user fields, or API payloads.

## Theme Selector

Phase 01.4 adds `client/components/theme/ThemeSelector.tsx`.

Selector behavior:

- Supports exactly `system`, `light`, and `dark`.
- Displays the stored preference rather than only the resolved theme.
- Updates the interface immediately through `useTheme()`.
- Persists through the existing `pfm.ui.theme` runtime.
- Uses native radio controls so selected state and keyboard behavior are programmatically exposed.
- Does not submit forms and does not call any API.
- Works independently of authentication state.

Phase 01.4 also adds the selector minimally to `client/app/(dashboard)/settings/page.tsx`. The settings page keeps the existing base-currency behavior: it reads the authenticated user, patches only `base_currency`, updates the auth store after save, and preserves the monthly currency-change conflict message.

## Accessibility

Phase 01.3 adds browser `color-scheme` synchronization so native controls can match the resolved theme.

Phase 01.4 adds:

- A labeled `fieldset`/`legend` for the theme selector.
- Native radio inputs for keyboard and screen-reader selected-state semantics.
- Theme-safe global selection colors.
- Theme-safe global `focus-visible` defaults for common interactive elements.
- A global reduced-motion media query that minimizes animations, transitions, and smooth scrolling when requested.
- A `finance-number` utility that enables tabular numerals for later financial amount migrations.

## Token Validation

Validated conceptually against the Phase 01.2 requirements:

- Page background and foreground now form a real light theme.
- Card and card foreground remain readable in both themes.
- Muted text has stronger contrast than the prior white/70-on-dark default.
- Primary/primary foreground pair is designed for readable buttons in both themes.
- Income, expense, warning, destructive, and info each have base, soft, and foreground pairs.
- Focus/ring tokens are distinct purple values in both themes.
- Chart colors have separate light and dark values and do not depend on opacity alone.
- Borders are visible in both themes through `--border` and `--border-strong`.

Further visual validation with actual route screenshots is deferred until the theme runtime and selector exist.

## Hardcoded Style Migration Inventory

### Global Blockers

- `client/app/globals.css`: default `:root` dark-first palette was fixed in Phase 01.2.
- `client/app/layout.tsx`: root theme mutation and hydration handling were fixed in Phase 01.3.
- `client/components/ui/chart.tsx`: chart wrapper hardcodes Recharts axis tick text to white.
- `client/components/charts/IncomeVsExpenseChart.tsx`: rendered line colors now resolve because Phase 01.2 adds `--color-income` and `--color-expense`.
- `client/app/(dashboard)/settings/page.tsx`: the missing settings page was restored in Phase 01.4 so the selector and currency setting have a route.

### Shared Component Blockers

- `client/components/Footer.tsx`: footer still uses `from-black`, active `text-white`, `bg-icon`, and board active `text-white bg-icon/20`; Phase 01.4 only added a minimal `/settings` link so the selector is reachable.
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

- System/Light/Dark runtime was added in Phase 01.3.
- Persistent theme preference was added in Phase 01.3.
- Pre-paint theme boot was added in Phase 01.3.
- `color-scheme` handling was added in Phase 01.3.
- Theme selector access was added in Phase 01.4.
- Focus-visible, reduced-motion, selection-color, and financial-number foundations were added in Phase 01.4.
- Default `:root` tokens are now a production light-theme foundation.
- `client/app/(dashboard)/settings/page.tsx` now exists and preserves currency behavior while adding theme control.

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

No page redesign was performed in Phase 01.1 through Phase 01.4.

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

- Full E2E has a baseline blocker in `e2e/pfm.e2e.spec.mjs` test `integrated finance journeys render across breakpoints`: repeated approved runs timed out on seeded `POST /api/v1/transactions` or `POST /api/v1/transactions/transfers` calls, unrelated to Phase 01.4 theme code. Focused theme browser coverage passed.
- Production build may require network approval because `next/font/google` fetches the existing Urbanist font.
- Optional `lint` and unit `test` scripts are not defined in `client/package.json`.

## Changed Files

### Phase 01.1

- `PFM_PROJECT_STATE.md`
- `docs/ui-redesign/01_DESIGN_SYSTEM_THEME_FOUNDATION.md`

### Phase 01.2

- `PFM_PROJECT_STATE.md`
- `client/app/globals.css`
- `docs/ui-redesign/01_DESIGN_SYSTEM_THEME_FOUNDATION.md`

### Phase 01.3

- `PFM_PROJECT_STATE.md`
- `client/app/globals.css`
- `client/app/layout.tsx`
- `client/components/theme/ThemeProvider.tsx`
- `client/lib/theme.ts`
- `client/lib/theme-script.ts`
- `docs/ui-redesign/01_DESIGN_SYSTEM_THEME_FOUNDATION.md`

### Phase 01.4

- `PFM_PROJECT_STATE.md`
- `client/app/(dashboard)/settings/page.tsx`
- `client/app/globals.css`
- `client/components/Footer.tsx`
- `client/components/theme/ThemeSelector.tsx`
- `client/e2e/theme.e2e.spec.mjs`
- `docs/ui-redesign/01_DESIGN_SYSTEM_THEME_FOUNDATION.md`
