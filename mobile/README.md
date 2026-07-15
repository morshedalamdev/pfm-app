# PFM Mobile Web

This directory contains the new mobile-only Next.js frontend. It is isolated
from the legacy `client` application and consumes the existing FastAPI backend
from `server` without modifying it.

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
