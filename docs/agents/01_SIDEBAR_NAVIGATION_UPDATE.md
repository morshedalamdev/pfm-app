# Agent 01 - Sidebar and Navigation Update

## Phase 01.1 - Navigation Baseline and File Mapping

## Files Inspected

- `AGENT.md`
- `docs/audit/00_CURRENT_APP_AUDIT.md`
- `docs/audit/01_FEATURE_IMPLEMENTATION_CHECKLIST.md`
- `docs/audit/02_BASELINE_TEST_REPORT.md`
- `client/package.json`
- `client/app/layout.tsx`
- `client/app/globals.css`
- `client/app/(dashboard)/layout.tsx`
- `client/components/Footer.tsx`
- `client/components/AccountBoard.tsx`
- `client/components/ui/sheet.tsx`
- `client/app/(dashboard)/page.tsx`
- `client/app/(dashboard)/analytics/page.tsx`
- `client/app/(dashboard)/transaction/page.tsx`
- `client/app/(dashboard)/transaction/[id]/page.tsx`
- `client/app/(dashboard)/loan/page.tsx`
- `client/app/(dashboard)/loan/[id]/page.tsx`
- `client/app/(dashboard)/savings/page.tsx`
- `client/app/(dashboard)/savings/[id]/page.tsx`
- `client/app/(dashboard)/budget/page.tsx`
- `client/app/(dashboard)/budget/setup/page.tsx`
- `client/app/(dashboard)/settings/page.tsx`
- `client/app/(dashboard)/profile/page.tsx`

## Current Sidebar Behavior

- The app does not currently have a desktop sidebar component.
- Dashboard navigation is implemented by `client/components/Footer.tsx` as a fixed bottom navigation plus a Radix sheet menu.
- `client/app/(dashboard)/layout.tsx` wraps dashboard pages in `AuthGuard` and renders `Footer` after page content.
- `Footer` only renders on `MAIN_ROUTES`: `/`, `/analytics`, `/transaction`, and `/loan`.
- The bottom navigation links are configured in the local `LIST` constant in `Footer.tsx`.
- The sheet menu is opened by the ellipsis action in the footer.
- Existing sheet board links include:
  - `Savings Goals` -> `/savings`
  - `Budget Planning` -> `/budget`
  - `Budget Setup` -> `/budget/setup`
- Mobile sheet behavior comes from `client/components/ui/sheet.tsx`, which wraps Radix Dialog primitives and defaults to a right-side panel.
- The sheet content in `Footer.tsx` uses `h-[calc(100svh-236px)]`, `overflow-y-auto`, and bottom padding to keep menu content scrollable with a fixed logout button.
- Active bottom-nav styling is applied in `Footer.tsx` with `pathname === i.href ? "p-5 text-white bg-icon" : "text-input"`.
- Sheet board links do not currently apply active-route styling.

## Current Route Structure

- Dashboard routes live under the `client/app/(dashboard)` route group.
- Existing dashboard pages:
  - `/`
  - `/analytics`
  - `/transaction`
  - `/transaction/[id]`, including `/transaction/create` as a pseudo-id path
  - `/loan`
  - `/loan/[id]`, including `/loan/create` as a pseudo-id path
  - `/savings`
  - `/savings/[id]`, including `/savings/create` as a pseudo-id path
  - `/budget`
  - `/budget/setup`
  - `/settings`
  - `/profile`
- Auth routes live under `client/app/auth`.

## Account List Location

- The account list and account create/delete UI are implemented in `client/components/AccountBoard.tsx`.
- `AccountBoard` is imported and rendered inside the sheet menu in `client/components/Footer.tsx`.
- `AccountBoard` fetches accounts with `listAccounts`, creates accounts with `createAccount`, and removes accounts with `deleteAccount`.
- Account creation currently uses the signed-in user's `base_currency` and an opening balance of `0`.

## Missing Routes

- `Accounts`: missing; there is no `client/app/(dashboard)/accounts/page.tsx` or `client/app/(dashboard)/account/page.tsx`.
- `Savings Goals`: exists at `/savings`.
- `Budget Planning`: exists at `/budget`.
- `Budget Setup`: exists at `/budget/setup`.

## Planned Files to Change

- Phase 01.2:
  - `client/components/Footer.tsx`
  - `docs/agents/01_SIDEBAR_NAVIGATION_UPDATE.md`
- Phase 01.3:
  - `client/components/Footer.tsx`
  - `docs/agents/01_SIDEBAR_NAVIGATION_UPDATE.md`
- Phase 01.4:
  - `client/app/(dashboard)/accounts/page.tsx`
  - `docs/agents/01_SIDEBAR_NAVIGATION_UPDATE.md`
- Phase 01.5:
  - `docs/agents/01_SIDEBAR_NAVIGATION_UPDATE.md`

## Test Commands

- `cd client && npm run build`
- `cd client && npm run lint`: not available; `client/package.json` has no `lint` script.
- `cd client && npm run typecheck`: not available; `client/package.json` has no `typecheck` script.
