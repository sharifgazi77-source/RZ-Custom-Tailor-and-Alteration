# RZ Custom Tailor & Alteration

Responsive React storefront/catalogue and admin foundation with a FastAPI/SQLAlchemy API, styled in the supplied navy, ivory and gold tailoring direction. The provided project structure is used for the browser client, with `backend/` and `docs/` added for the Python service and handover material.

## Local setup

Requirements: Node.js 20+, Python 3.11+. PostgreSQL may be used by setting `DATABASE_URL`; the default is a local SQLite development database. Cloudinary is configured by filling its three keys in `backend/.env`; without them, uploads go to local `backend/uploads`.

```powershell
npm install
Copy-Item backend/.env.example backend/.env
python -m venv backend/.venv
backend/.venv/Scripts/Activate.ps1
pip install -r backend/requirements.txt
alembic upgrade head
uvicorn app.main:app --app-dir backend --reload
```

In another terminal, run `npm run dev`. The Vite client defaults to `http://localhost:8000/api/v1`; override with `VITE_API_BASE_URL` if needed. API docs are at `http://localhost:8000/docs`. On Windows, `setup-windows.ps1` installs the dependencies and `start-backend.ps1` starts FastAPI.

Edit `backend/.env` with an administrator email and password (12+ characters), set a new `SECRET_KEY`, run `alembic upgrade head`, then run `./bootstrap-admin.ps1` once to create the first administrator. SQLite is for local development; configure PostgreSQL before deployment.

## Current implementation and known gaps

Implemented: responsive dashboard and storefront/catalogue, editable store identity/contact/hours/social settings, product create/edit with a primary image, API service layer, FastAPI health/login/product/dashboard/image-upload/settings endpoints, SQLAlchemy core models, Alembic migrations, server-side administrator checks, image type/content/size validation, Cloudinary or local upload storage, product validation, and API tests.

Not implemented: customer product detail/cart/checkout/accounts, order creation and management workflows, full product gallery/options/variants, appointment conflict workflow, tailoring/measurements, editable banners and full page CMS, payment integration/webhooks, shipping/tax, rate limiting, audit history, production hosting/operations, and complete requested schema. The attached reference images informed the visual direction, but a pixel-by-pixel browser comparison was not completed. The store hero uses a remote image and needs a licensed, owned production asset.

## Verification report

See [docs/test-report.md](docs/test-report.md) for executed checks and remaining QA gaps. This is a verified development foundation, not a production-ready store.
