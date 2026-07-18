# PFM Frontend

This directory contains the production Next.js frontend. It replaces the
legacy desktop client and consumes the FastAPI backend from `server`.

The interface is intentionally limited to a phone-width canvas. Its reusable
design tokens, finance cards, navigation, reports, goals, and light/dark themes
are derived from the images in `../ref-ui`.

## Local commands

```bash
npm install
npm run dev
npm run check
npm run e2e
```

Copy `.env.example` to `.env.local` when connecting the frontend to a running
backend.

## API and sessions

The FastAPI schema is exported into `generated/` and converted to TypeScript.
Run `npm run api:generate` after a backend contract change and `npm run
api:check` to detect drift.

Authentication is handled by Next.js route handlers. Access and refresh tokens
are stored only in HTTP-only, same-site cookies and are never returned to or
persisted by browser JavaScript. Requests to the FastAPI backend use the
same-origin `/api/backend/*` proxy, which refreshes expired access tokens before
retrying once.
