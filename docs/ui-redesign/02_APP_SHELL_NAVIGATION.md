# UI Redesign Agent 02 - Website Application Shell and Navigation

## Reference Files

All expected read-only reference files are present under `ref-ui/`:

- `IMG-01.jpeg` - 3200x2400 mobile shell reference.
- `IMG-02.jpeg` - 1600x1200 internal page header and bottom navigation reference.
- `IMG-03.jpeg` - 1600x1200 large surface and chart containment reference.
- `IMG-04.jpeg` - 1600x1200 savings/card positioning reference.
- `IMG-05.jpeg` - 1600x1200 dense report row reference.
- `IMG-06.jpeg` - 1600x1200 horizontal card grouping reference.

The images remain outside production code and public assets.

## Existing Shell Baseline

The current root layout is `client/app/layout.tsx`. It loads the Urbanist Google font, global CSS, the theme boot script, runtime API config script, a decorative ellipse image, and wraps the app in `ThemeProvider`.

The root `<html>` has `overflow-x-hidden` and `suppressHydrationWarning` for the theme boot mutation. The root `<body>` is globally constrained by CSS to `max-w-md`, `w-full`, and centered. The root `<main>` uses `relative h-svh mx-auto z-10`.

The authenticated app boundary is `client/app/(dashboard)/layout.tsx`. It wraps dashboard routes with:

- `AuthGuard`
- `RecurringReminderProvider`
- route children
- `Footer`
- recurring income and expense popups

There is not yet a full responsive authenticated shell, desktop sidebar, top bar, route metadata map, or centralized navigation configuration.

## Route Inventory

Authenticated route group under `client/app/(dashboard)`:

- `/`
- `/accounts`
- `/accounts/create`
- `/analytics`
- `/budget`
- `/budget/setup`
- `/loan`
- `/loan/create` through `loan/[id]`
- `/loan/[id]`
- `/profile`
- `/savings`
- `/savings/create` through `savings/[id]`
- `/savings/[id]`
- `/settings`
- `/transaction`
- `/transaction/create` through `transaction/[id]`
- `/transaction/[id]`

Public auth routes under `client/app/auth`:

- `/auth`
- `/auth/login`
- `/auth/register`
- `/auth/forgot-password`
- `/auth/recover-password`

Confirmed availability for required Agent 02 links:

- `/accounts` exists.
- `/transaction/create` exists via `transaction/[id]` pseudo-id handling.
- `/loan/create` exists via `loan/[id]` pseudo-id handling.
- `/savings/create` exists via `savings/[id]` pseudo-id handling.

## Navigation Inventory

Current primary navigation lives in `client/components/Footer.tsx`.

The footer is fixed only on these routes:

- `/`
- `/analytics`
- `/transaction`
- `/loan`

The footer primary links are:

- `/analytics` labeled `Income`
- `/transaction` labeled `Transaction`
- `/` labeled `Home`
- `/loan` labeled `Loan`

The fifth footer action opens a Radix `Sheet` profile/menu surface. Board links in the sheet are:

- `/accounts`
- `/savings`
- `/budget`
- `/budget/setup`

The current active-route logic is local to `Footer.tsx`:

- Primary footer buttons match exact path only.
- Sheet board links match exact path and nested paths except the `/budget` link intentionally does not match `/budget/setup`.

There is no shared navigation item type, mobile placement model, route metadata map, desktop sidebar, tablet rail, mobile Add action, Plan menu, or More menu yet.

## Existing User Menu Actions

The current footer sheet includes:

- Profile summary from `useAuthStore().user`
- Profile edit link to `/profile`
- Accounts link to `/accounts`
- Savings Goals link to `/savings`
- Budget Planning link to `/budget`
- Budget Setup link to `/budget/setup`
- Support buttons: `What is Infiny PFM`, `Privacy Notice`, `User Agreement`, `Contact Us`
- Settings link to `/settings`
- Reset Password link to `/auth/forgot-password`
- Delete Account button with no implemented handler
- Logout button

Logout calls `useAuthStore().logout()`, clears local tokens, attempts backend logout when a refresh token exists, and redirects with `router.replace("/auth/login")`.

Unread notifications are fetched in `Footer.tsx` from `/api/v1/notifications/unread-count`, but only when the current route is one of the four footer `MAIN_ROUTES`.

## Existing Responsive Constraints

The app is still globally mobile-width constrained:

- `client/app/globals.css` sets `body` to `max-w-md w-full mx-auto`.
- `Footer.tsx` is `fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-[70px]`.
- Several feature pages use fixed-height calculations and internal scroll regions tied to the mobile shell.
- Dashboard, analytics, transaction, budget, savings, and loan pages use local bottom padding or internal scroll areas to avoid the footer.

The current desktop experience is the mobile shell centered in the viewport.

## Existing Safe-Area Behavior

No `env(safe-area-inset-*)` usage was found in production app or component code.

Existing mobile viewport and input behavior:

- `client/app/layout.tsx` exports `viewport` with `width: "device-width"` and `initialScale: 1`.
- `client/app/globals.css` sets mobile `input`, `select`, and `textarea` font size to `16px` below `768px` to avoid mobile browser focus zoom.
- Several surfaces use `svh` or `dvh`, including root layout, footer sheet content, drawers, dialogs, and recurring popups.

## Existing Overflow Behavior

Global overflow behavior:

- `<html>` and `<body>` use `overflow-x-hidden`.
- All scrollbars are hidden globally in `globals.css`.
- The root `<main>` has `h-svh`.

Feature pages often create their own scroll regions, for example:

- Analytics uses `h-[calc(100%-44px)] pb-[70px] overflow-y-auto`.
- Transaction list uses `h-[calc(100%-6.5rem)] overflow-y-auto`.
- Budget, savings, and loan lists use route-specific calculated heights.
- Footer sheet content uses `h-[calc(100svh-236px)] overflow-y-auto`.

There is no single predictable primary shell scroll container yet.

## Existing Z-Index Behavior

Current stacking is inconsistent:

- Root decorative image uses `z-0`.
- Root `<main>` uses `z-10`.
- Radix/Vaul overlays, dialogs, sheets, drawers, popovers, dropdowns, and selects generally use `z-50`.
- The mobile footer uses `z-999`.

The footer can therefore sit above overlay layers unless those layers create a higher stacking context or portal behavior wins visually. A documented shell stacking strategy is still needed.

## Agent 01 Dependency Verification

Agent 01 is complete enough for Agent 02 to proceed.

Verified Agent 01 deliverables:

- `docs/ui-redesign/01_DESIGN_SYSTEM_THEME_FOUNDATION.md` exists.
- `docs/ui-redesign/01_DESIGN_SYSTEM_THEME_TEST_REPORT.md` exists.
- `client/app/globals.css` defines light and dark semantic tokens, navigation tokens, finance tokens, focus tokens, chart tokens, motion, radius, shadow, and typography foundations.
- `client/lib/theme.ts` and `client/lib/theme-script.ts` exist.
- `client/components/theme/ThemeProvider.tsx` exists and provides `useTheme`.
- `client/components/theme/ThemeSelector.tsx` exists.
- `client/app/layout.tsx` runs the pre-paint theme script and wraps children in `ThemeProvider`.
- `/settings` includes the theme selector while preserving currency behavior.

Known Agent 01 limitation:

- Full `npm run e2e` remains blocked by an existing integrated finance journey timeout unrelated to theme work. Focused theme coverage and build/type/API checks passed in Agent 01.

## Planned Navigation Information Architecture

Future phases should use one typed source of truth for:

- Desktop sidebar
- Tablet rail/sidebar
- Mobile bottom navigation
- Add menu
- Plan menu
- More menu
- Route-aware titles and back controls

Planned desktop structure from current available routes:

- Overview: `/`
- Transactions: `/transaction`
- Accounts: `/accounts`
- Plan / Budgets: `/budget`
- Plan / Budget Setup: `/budget/setup`
- Plan / Savings Goals: `/savings`
- Plan / Loans & Debt: `/loan`
- Insights / Reports: `/analytics`
- Account / Settings: `/settings`

Profile should remain available through user-menu behavior rather than primary sidebar space.

Planned mobile five-position structure:

- Home: `/`
- Reports: `/analytics`
- Add: opens existing-route shortcuts
- Plan: menu for `/budget`, `/budget/setup`, `/savings`, `/loan`
- More: menu for accounts, settings, profile, theme, reset-password, delete-account, logout, and support actions

Candidate Add shortcuts based on current routes:

- Add Transaction: `/transaction/create`
- Add Account: `/accounts/create`
- Add Savings Goal: `/savings/create`
- Add Loan or Debt: `/loan/create`

## Planned Files to Change

Later Agent 02 phases are expected to modify or create shell-level files such as:

- `client/app/(dashboard)/layout.tsx`
- `client/app/globals.css`
- `client/components/Footer.tsx`
- New shell/navigation components under `client/components/`
- New navigation and route metadata helpers under `client/lib/`
- Focused shell Playwright tests under `client/e2e/`
- `docs/ui-redesign/02_APP_SHELL_NAVIGATION.md`
- `docs/ui-redesign/02_APP_SHELL_NAVIGATION_TEST_REPORT.md`
- `PFM_PROJECT_STATE.md`

Production behavior was not changed in Phase 02.1.

## Phase 02.2 Shell Foundation

Phase 02.2 added a reusable authenticated shell without replacing the final navigation system.

Implemented shell structure:

- `client/components/shell/AuthenticatedAppShell.tsx`
- Shell root with `data-shell="authenticated"`
- Placeholder sidebar region with `data-shell-region="sidebar"`
- Placeholder top-bar region with `data-shell-region="top-bar"`
- Primary main region with `data-shell-region="main"`
- Mobile navigation region with `data-shell-region="mobile-navigation"`
- Migration-safe content wrapper with `data-content-mode="legacy-constrained"`

The shell owns authenticated viewport structure with `h-full`, `min-h-svh`, full-width background, one primary main scroll container, and overflow-x protection. The legacy page content remains constrained to `max-w-md` inside the shell until later page agents migrate content layouts.

Public auth routes are kept outside the authenticated shell through `client/app/auth/layout.tsx`, which preserves the prior auth-page mobile-width constraint.

The existing `Footer` remains the temporary mobile-navigation content in this phase. Final desktop sidebar, top bar, mobile bottom navigation, Add menu, Plan menu, and More menu are deferred to later phases.

## Authentication Boundary

Authenticated routes now use `AuthenticatedAppShell` after auth resolves. During auth hydration, `AuthGuard` renders a shell-safe loading fallback without mounting the footer, unread-count fetch, recurring popups, or protected navigation actions.

Public auth routes under `/auth` do not render `data-shell="authenticated"`.

## Responsive Rules

Global `body` is no longer restricted to `max-w-md`. The global root is full-width, while the authenticated shell uses an internal `legacy-constrained` wrapper so unfinished feature pages do not stretch across desktop viewports.

This preserves the current mobile-first feature-page layouts while allowing later phases to add desktop/sidebar structure around them.

## Safe Area

The shell defines safe-area variables:

- `--pfm-shell-safe-top`
- `--pfm-shell-safe-right`
- `--pfm-shell-safe-bottom`
- `--pfm-shell-safe-left`

The shell applies top and bottom safe-area padding. The temporary footer also accounts for `--pfm-shell-safe-bottom` while retaining its existing fixed mobile behavior.

## Overflow Strategy

The authenticated shell establishes the main region as the primary shell scroll container with vertical scrolling and horizontal overflow hidden. Existing legacy pages may still contain internal scroll regions; those are documented as deferred page-level migration work.

## Z-Index Strategy

Phase 02.2 introduced shell z-index tokens in `client/app/globals.css`:

- `--z-shell-content`
- `--z-shell-sticky`
- `--z-shell-navigation`
- `--z-shell-overlay`
- `--z-shell-dialog`
- `--z-shell-toast`

The temporary footer now uses `--z-shell-navigation` instead of the previous `z-999`, allowing existing Radix/Vaul overlays at `z-50` to render above shell navigation.

## Theme Integration

The shell uses Agent 01 semantic tokens:

- `bg-background`
- `text-foreground`
- `bg-sidebar`
- `text-sidebar-foreground`
- `border-sidebar-border`
- `bg-surface-overlay`
- `border-border`

No new theme provider, theme storage key, or theme runtime was added.

## Accessibility

Phase 02.2 adds semantic shell regions without final navigation interactions:

- `aside` with `aria-label="Primary navigation"`
- `header` with `aria-label="Application header"`
- `main` for the authenticated content region

The protected navigation footer remains hidden until auth resolves.

## Blockers

- Full E2E has an existing baseline blocker from Agent 01 and was reproduced in Phase 02.1: the isolated suite passed the first three E2E tests, then `integrated finance journeys render across breakpoints` timed out on `POST /api/v1/transactions/transfers`.
- Sandboxed production builds may fail without network access because `next/font/google` fetches the existing Urbanist font.
- `npm run e2e` requires local PostgreSQL, API, Next.js, and browser processes that may need approval outside the sandbox.
- There is no current centralized navigation/route metadata layer; this is planned for later Agent 02 phases.

## Phase 02.2 Verification

Commands and checks:

- `cd client && npx tsc --noEmit` passed.
- `cd client && npm run api:check` passed.
- `cd client && npm run build` passed after approved network rerun for the existing Google-hosted Urbanist font.
- `cd client && npm run lint --if-present` passed as a no-op because no lint script exists.
- `cd client && npm run test --if-present` passed as a no-op because no unit test script exists.
- `cd client && npm run e2e -- e2e/shell-foundation.e2e.spec.mjs` passed after approved local server/browser permissions.

Focused browser coverage verified:

- `/auth/login` does not use the authenticated shell.
- `/`, `/analytics`, `/transaction`, `/accounts`, `/loan`, `/budget`, `/savings`, and `/settings` render the authenticated shell structure.
- Shell main and legacy constrained content regions exist.
- Horizontal document overflow is not introduced on checked routes.
- Light and dark saved theme preferences still apply with the shell mounted.

## Changed Files

### Phase 02.1

- `PFM_PROJECT_STATE.md`
- `docs/ui-redesign/02_APP_SHELL_NAVIGATION.md`

### Phase 02.2

- `PFM_PROJECT_STATE.md`
- `client/app/(dashboard)/layout.tsx`
- `client/app/auth/layout.tsx`
- `client/app/globals.css`
- `client/app/layout.tsx`
- `client/components/Footer.tsx`
- `client/components/auth/AuthGuard.tsx`
- `client/components/shell/AuthenticatedAppShell.tsx`
- `client/e2e/shell-foundation.e2e.spec.mjs`
- `docs/ui-redesign/02_APP_SHELL_NAVIGATION.md`

## Deferred Page-Level Work

Do not redesign feature-page content in Agent 02. Page-level redesign remains deferred for:

- Dashboard cards and charts
- Analytics charts and rows
- Transaction list, filters, and form contents
- Accounts content surfaces
- Budget and budget setup content
- Savings cards and contribution UI
- Loan/debt cards, people drawer, records, and settlement UI
- Settings form content beyond shell placement
- Profile content
- Authentication pages
