# Architecture

The repository is a monorepo with a React, TypeScript and Vite browser client at the root and a FastAPI service in `backend/`. The browser reaches the versioned REST API through `VITE_API_BASE_URL`. SQLAlchemy models are the persistence boundary; Alembic owns schema upgrades. SQLite is used only for local development. Production should use PostgreSQL via `DATABASE_URL`.

The current implemented vertical slice includes public health and published-product reads, administrator password login, token-protected product reads/writes and a dashboard built from saved orders, paid revenue, products and customer profiles. Remaining modules are called out in the README; this repository is not yet a production release.
