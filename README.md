# RZ Custom Tailor & Alteration

Responsive customer storefront and admin application built with React, TypeScript, Vite and Tailwind CSS, backed by FastAPI, Pydantic, SQLAlchemy, Alembic and PostgreSQL-compatible persistence. `docs/ui-system-blueprint.md` describes the design and system boundary. The visual direction follows the supplied RZ navy/ivory/gold references and Toronto business-card details.

## What's in this development release

- Storefront home, shop/catalogue, product details/selection, cart and cash-on-delivery checkout, contact, reviews and appointment request UI.
- Admin login and protected APIs; dashboard aggregates; product, categories, media, store settings, orders, appointment and campaign screens.
- RZ identity, contact, hours, address/map, social links (TikTok, Facebook, Instagram, YouTube, LinkedIn), logo and homepage hero are configurable in Store settings.
- Admin **Offers** lets the owner create, edit, draft, publish and archive Black Friday, Christmas, Eid or custom offers. Campaign cards appear directly below the tailor-measuring hero, with a short active-offer strip below navigation. Campaign artwork, copy, CTA, qualifying products/categories, date window and approved discount can be configured.
- Checkout calculates at most one discount on the server and snapshots subtotal, discount, campaign and final total on the order. Product sale prices do not stack with campaigns; COD orders remain unpaid.
- Local uploads work for development; Cloudinary can be used when configured. Image metadata and storage keys are stored in the database.
- PostgreSQL-compatible SQLAlchemy models, Alembic migration chain and local SQLite mode.

This is a functional development handover, **not a claim of production readiness**. Important items from the broad master specification remain unimplemented; see `docs/test-report.md` and the known gaps below.

## Run locally on Windows / PyCharm

Requirements: Node.js 20+, Python 3.11+, Git optional. SQLite is the default for local evaluation. Install PostgreSQL for local PostgreSQL testing/production.

1. Extract the ZIP to a folder and open that project folder in PyCharm. Use its terminal at the project root.
2. Install frontend dependencies and Python environment:

```powershell
npm install
python -m venv backend/.venv
backend/.venv/Scripts/Activate.ps1
python -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
```

3. Set `SECRET_KEY` and (if using PostgreSQL) `DATABASE_URL` in `backend/.env`. Apply migrations:

```powershell
python -m alembic upgrade head
```

4. Create the first admin from a new terminal after setting admin credentials in `backend/.env`:

```powershell
./bootstrap-admin.ps1
```

5. Start the API and frontend in separate terminals:

```powershell
uvicorn app.main:app --app-dir backend --reload
npm run dev
```

Open the Vite URL printed in the frontend terminal. FastAPI docs are at `http://localhost:8000/docs`. `setup-windows.ps1` and `start-backend.ps1` are convenience scripts. Do not commit or share `.env` files. The project ZIP intentionally excludes local databases, venv, uploads, dependencies and secrets.

## Configuration

`backend/.env.example` lists the API environment values; frontend `VITE_API_BASE_URL` defaults to `http://localhost:8000/api/v1`. Production secrets belong in the hosting provider's environment/secret manager. Configure `DATABASE_URL`, `SECRET_KEY`, `ALLOWED_ORIGINS`, Cloudinary credentials, currency, and the actual owner-approved store details. The settings screen's initial contact values are based on the supplied card; verify these with the owner before launch.

## Validation commands

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
python -m compileall -q backend/app backend/alembic backend/tests
python -m alembic upgrade head
```

Actual results and checks that could not be completed are in `docs/test-report.md`. Do not interpret a local UI build as proof that production checkout, uploads, security controls or browser/mobile flows have passed.

## Before public launch

- Complete the remaining customer account/order history, full tailoring request and measurement records, richer product variants/gallery ordering, customer admin, CMS/banner management, payment provider/webhooks, taxes/shipping, email notifications, throttling, audit logging and production operational work.
- Use persistent hosted image storage (Cloudinary is available as the configured adapter), managed PostgreSQL or a backed-up database, HTTPS, restrictive CORS, monitored API health, database and object-storage backups, and restore drills.
- Obtain licensed fitting photography if a photo-real hero is required. The included offline SVG is an original tailoring-measurement illustration and can be replaced from Store settings/media.
- Select an online payment provider supported for Canada before enabling it. The current checkout only supports COD and does not store card credentials.
- Set final offer terms, dates, products, tax/shipping and cancellation policy with the owner. Campaign dates are interpreted in `America/Toronto`; no sale is published by default.

## Documentation

- `docs/ui-system-blueprint.md` — page layout, mobile behavior and application boundaries.
- `docs/admin-user-guide.md` — products, campaigns, media and store settings.
- `docs/database-schema.md` — current tables, campaign/order totals and known gaps.
- `docs/api-documentation.md` — REST routes and authorization.
- `docs/deployment-guide.md` — Cloudflare/Hostinger deployment outline and prerequisites.
- `docs/backup-and-recovery.md` — local backup basics and production recovery requirements.
- `docs/test-report.md` — verifiable QA status and limitations.
