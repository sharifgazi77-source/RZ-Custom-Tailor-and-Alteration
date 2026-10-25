# Deployment guide (preparation)

1. Provision a managed PostgreSQL database and persistent object storage in accounts owned by the business.
2. Deploy the Vite static build to a static host and FastAPI to an ASGI host. Configure the API URL at build time.
3. Set `DATABASE_URL`, a generated high-entropy `SECRET_KEY`, restrictive `ALLOWED_ORIGINS`, and storage configuration as host secrets.
4. Run `alembic upgrade head` as a release step. Enable TLS, database backups, health checks at `/api/v1/health`, and log/alert retention.
5. Configure a custom domain and HTTPS, then test the full checkout, upload, auth, restore and mobile flows before taking orders.

This is a deployment outline, not a verified deployment. Object storage, customer checkout, payment provider webhooks, rate limiting, admin bootstrap workflow, and production operations controls are not implemented yet.
