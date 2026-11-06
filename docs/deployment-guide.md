# Deployment guide (Hostinger + Cloudflare preparation)

This guide prepares a real deployment but does not claim that any account/domain has been changed. The app in this handover is not yet launch-ready; close the gaps in the README and QA report first.

## Hosting shape

This application has a static React frontend, a Python FastAPI API, PostgreSQL data and persistent image storage. A plain static website plan cannot run the whole app. Hostinger's current support notes Python is available on its Linux VPS plans and is self-managed; choose a VPS plan for FastAPI or run the API on another ASGI-compatible service. A Node/static-capable plan can serve the built frontend independently, but it does not replace the Python API. Verify the exact plan features and resource limits in the owner's Hostinger account before purchase.

Recommended initial layout:

```text
Cloudflare DNS + HTTPS
  rzcustomtailor.com            → frontend static hosting / reverse proxy
  api.rzcustomtailor.com        → FastAPI on Hostinger VPS (or compatible ASGI host)
Managed PostgreSQL              → DATABASE_URL (TLS enabled)
Cloudinary                      → persistent product/campaign/media images
```

Alternatively, serve the Vite `dist` directory and reverse-proxy `/api` from the same Linux VPS. Configure a real TLS certificate, firewall, process restart policy, logs and backups; do not expose Uvicorn's development server directly to the public internet.

## Prepare app configuration

1. Create PostgreSQL and object-storage accounts under the business owner's control.
2. Build the frontend with `VITE_API_BASE_URL=https://api.rzcustomtailor.com/api/v1`.
3. Configure backend secrets in the host: `DATABASE_URL`, a random high-entropy `SECRET_KEY`, `ALLOWED_ORIGINS=https://rzcustomtailor.com,https://www.rzcustomtailor.com`, `UPLOAD_DIR`, and Cloudinary cloud/key/secret. Never commit secrets.
4. Install Python dependencies in an isolated virtual environment; run `alembic upgrade head` as a release step.
5. Configure a production-only admin bootstrap account, then remove bootstrap credentials from the environment after the account is created.
6. Add a process manager/reverse proxy, restrict inbound ports, enable TLS, verify `/api/v1/health`, and check application logs.
7. Test account security, campaign rendering/checkout, COD order handling, image uploads/retrieval after restart, appointments, backups/restores, and narrow/mobile viewports before accepting orders.

## Connect the Cloudflare domain

If the domain is registered at Cloudflare, it normally already uses Cloudflare DNS; confirm the zone status and authoritative nameservers in the Cloudflare dashboard. Add records using the target values provided by the selected host (commonly a root A/AAAA record or CNAME plus a separate `api` record). Do not guess server IPs. Enable proxying only after confirming the host supports Cloudflare proxying and configure TLS mode/certificates consistently. Redirect or canonicalize `www` after DNS and HTTPS work. Check that email MX/TXT records are preserved.

If the nameservers are not Cloudflare, update them at the registrar only after copying all existing DNS records and verifying mail routing. Wait for the zone to become active, then validate both apex and `www` records, API DNS, HTTPS, and the browser CORS policy.

## Database, storage, recovery and monitoring

- Use managed PostgreSQL with TLS, least-privileged credentials, scheduled backups and point-in-time recovery where available.
- Use Cloudinary or another persistent object store; local `uploads/` is development-only and may disappear on redeploy. Restrict upload types/size and keep credentials private.
- Set health monitoring for `/api/v1/health`, alert on API/database errors, and retain logs without logging passwords, tokens or private customer measurements.
- Restore a backup into a separate database and test campaign/order/media records before calling backups verified.
- Configure HSTS only after HTTPS is stable. Keep admin credentials unique and rotate them after handover.

## Owner access and DNS references

The client should own Cloudflare, Hostinger, database, image-storage, payment and social accounts. Add the developer as a limited collaborator if required; never transfer a personal account password. Current Hostinger guidance says Python requires VPS/root access and is self-managed: [Hostinger Python support](https://support.hostinger.com/en/articles/3648030-is-python-supported-at-hostinger), [supported languages by plan](https://www.hostinger.com/support/which-programming-languages-and-frameworks-are-supported-at-hostinger/). Cloudflare explains [zone onboarding](https://developers.cloudflare.com/dns/get-started/), [nameserver changes](https://developers.cloudflare.com/dns/nameservers/update-nameservers/) and [DNS proxy status](https://developers.cloudflare.com/dns/proxy-status/).

No live domain, hosting plan, database, Cloudinary bucket, HTTPS certificate or backup is configured by this ZIP. Values shown above are deployment examples, not the owner's production secrets or DNS targets.
