# Personal Finance Management App

A full-stack personal finance tracker for monitoring income, expenses, savings, budgets, recurring transactions, and financial analytics.

The frontend UI is currently implemented with **Next.js**. The backend is being redesigned and implemented with **Python FastAPI** and **PostgreSQL**.

## Live Demo

- **Frontend**: [https://pfm.morshedalam.dev](https://pfm.morshedalam.dev)
- **API**: Hosted on Render

## Project Status

This project is under active development.

- Frontend UI: completed with Next.js and responsive dashboard screens.
- Backend: being migrated from the original Node/Nest.js plan to Python FastAPI.
- Database: PostgreSQL.
- Development workflow: milestone-based implementation with Codex agents.
- Current priority: build the FastAPI backend first, then connect the existing frontend UI to live server data.

## Project Ownership and Development Approach

The project idea, product direction, system design, planning, architecture, data model decisions, and milestone strategy are designed by **Myself**.

**Codex** is used as an AI development assistant to execute the implementation in controlled phases. Codex is not used to blindly generate the whole system at once. Each milestone is broken into smaller phases where the agent must:

1. Study the existing project state.
2. Think through the assigned phase.
3. Execute only the requested scope.
4. Run tests.
5. Fix bugs if tests fail.
6. Update the project state documentation.
7. Stop and ask for approval before continuing.

This workflow keeps the project architecture intentional, reviewable, and easier to maintain.

## Core Features

Planned and in-progress features include:

- User registration, login, JWT authentication, and refresh-token rotation.
- Account management for cash, bank, card, wallet, and savings accounts.
- Income, expense, and transfer tracking.
- Custom transaction categories.
- Monthly and custom-period budgets.
- Savings goals and contribution tracking.
- Dashboard summaries for income, expenses, balance, savings, and cash flow.
- Reports and analytics with charts and date-range filtering.
- Recurring transactions with background worker execution.
- Receipt upload support.
- Notification and email adapter support.
- Server-Sent Events for one-way real-time update signals where useful.
- Responsive frontend integration with live backend data.

## System Design

The application is designed as a **modular monolith**. This keeps the system simple enough for fast development while still enforcing clean boundaries between domains.

```text
pfm-app
├── client/                  # Next.js frontend
│   ├── app/                 # App Router pages and layouts
│   ├── components/          # UI and feature components
│   ├── lib/                 # Frontend utilities and API client layer
│   └── public/              # Static assets
└── server/                  # Python FastAPI backend
    ├── app/
    │   ├── api/             # Versioned API routers
    │   ├── core/            # Config, security, logging, app setup
    │   ├── db/              # Database session, migrations, base models
    │   ├── modules/         # Domain modules
    │   │   ├── auth/
    │   │   ├── users/
    │   │   ├── accounts/
    │   │   ├── transactions/
    │   │   ├── budgets/
    │   │   ├── savings/
    │   │   ├── reports/
    │   │   └── notifications/
    │   ├── workers/         # Background worker logic
    │   └── main.py          # FastAPI entrypoint
    ├── alembic/             # Database migrations
    └── tests/               # Backend tests
```

## Backend Architecture

The backend target architecture uses:

- **Python FastAPI** for API development.
- **PostgreSQL** as the primary database.
- **SQLAlchemy 2.x async ORM** for persistence.
- **Alembic** for schema migrations.
- **Pydantic** for request validation, response schemas, and settings.
- **JWT access tokens** with refresh-token rotation.
- **Argon2 password hashing** for secure password storage.
- **OpenAPI-generated TypeScript contracts** for frontend/backend type safety.
- **Background worker process** for recurring transactions and deferred jobs.
- **Outbox event table** for reliable internal event handling.
- **Adapter pattern** for email and file storage providers.
- **Server-Sent Events** only for one-way server-to-client notifications or refresh signals.

The backend is not designed as only a collection of CRUD endpoints. It is planned around finance-domain behavior, including balance consistency, transaction atomicity, idempotency, recurring rule execution, reporting queries, and frontend contract stability.

## Frontend Architecture

The frontend is built with:

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **Zustand** for client state where needed
- **Zod** for validation
- **Axios** for HTTP requests
- **Recharts** for financial charts
- **Lucide React** for icons
- **date-fns** for date handling

The current frontend UI is treated as the visual foundation. Backend integration will replace mock/static data with typed API responses while preserving the existing responsive design.

## Planned Data Domains

The backend is organized around the following domains:

- **Auth and Users**: identity, credentials, sessions, authorization.
- **Accounts**: user-owned financial accounts and balances.
- **Categories**: income and expense classification.
- **Transactions**: income, expense, and transfer records.
- **Budgets**: budget periods, limits, and category spending progress.
- **Savings Goals**: targets, contributions, and progress tracking.
- **Reports**: dashboard summaries, category breakdowns, cash-flow trends, and savings analytics.
- **Recurring Rules**: recurring income/expense generation.
- **Notifications**: persisted user notifications and optional delivery adapters.
- **Receipts**: file metadata and storage-provider abstraction.

## Prerequisites

Recommended local tools:

- Git
- Node.js 18+ or newer
- npm or pnpm
- Python 3.11+
- PostgreSQL
- Docker, optional but recommended for later deployment and integration testing

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/morshedalamdev/pfm-app.git
cd pfm-app
```

### 2. Run the Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:3000
```

### 3. Backend Development Direction

The backend is being implemented in Python FastAPI under the `server/` directory. The final commands will be confirmed as the FastAPI foundation milestone is completed.

Expected development flow:

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Expected backend URL:

```text
http://localhost:8000
```

Expected API documentation URL:

```text
http://localhost:8000/docs
```

## Environment Variables

The final `.env.example` will be maintained during backend implementation. Expected backend variables include:

```env
APP_ENV=development
APP_NAME=pfm-api
API_V1_PREFIX=/api/v1
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/pfm_app
JWT_SECRET_KEY=replace-with-local-secret
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Expected frontend variable:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

## Security Goals

Security requirements include:

- Strong password hashing with Argon2.
- Short-lived JWT access tokens.
- Refresh-token rotation and revocation.
- User-scoped authorization for all finance resources.
- Validation for all API inputs.
- Monetary values handled with decimal precision.
- Idempotency protection for transaction creation.
- CORS configured through environment variables.
- No secrets committed to the repository.

## Testing Strategy

The project will use phase-level and milestone-level tests.

Backend testing targets:

- Unit tests for domain services.
- Integration tests for API endpoints.
- Migration tests for Alembic schema changes.
- Authentication and authorization tests.
- Balance consistency and transfer atomicity tests.
- Reporting correctness tests.
- Worker idempotency and retry tests.

Frontend testing targets:

- Build validation.
- Type checking.
- API client contract validation.
- Loading, empty, error, and success states.
- Responsive layout checks.
- Full frontend/backend integration smoke tests.

## Current Development Principle

The goal is to build a production-quality personal finance system gradually instead of rushing a single large implementation. Every milestone must leave the repository in a working, testable state.

## Author

**Morshed Alam**

- Website: [morshedalam.dev](https://morshedalam.dev)
- GitHub: [@morshedalamdev](https://github.com/morshedalamdev)
- Live Project: [pfm.morshedalam.dev](https://pfm.morshedalam.dev)

## License

This project is licensed under the ISC License.

---

Built and architected by **Morshed Alam**. Implementation is developed through a controlled milestone-based workflow with Codex assistance.
