# API

FastAPI OpenAPI documentation is available at `/docs` while the API is running.

- `GET /api/v1/health`: public liveness check.
- `POST /api/v1/auth/login`: OAuth2 form fields `username` (email) and `password`; returns an admin bearer token.
- `GET /api/v1/products`, `GET /api/v1/categories`: public catalogue.
- `GET /api/v1/store/settings`: public store identity, contact, social links and settings.
- `GET /api/v1/campaigns`: only published campaigns whose date window includes today's `America/Toronto` date.
- `POST /api/v1/contact`: stores a contact message; does not send email.
- `POST /api/v1/appointments`: requests an appointment and rejects overlapping requests.
- `POST /api/v1/orders`: cash-on-delivery checkout. The server reloads prices, validates product choices, selects at most one eligible campaign and persists subtotal/discount/campaign/final total. COD is not marked paid.
- `GET /api/v1/admin/campaigns`: list all campaign states; requires admin bearer token.
- `POST /api/v1/admin/campaigns`, `PATCH /api/v1/admin/campaigns/{campaign_id}`: create/update campaign with scope, discount, date and CTA validation; admin only.
- `GET /api/v1/admin/products`, `POST /api/v1/admin/products`, `PATCH /api/v1/admin/products/{product_id}`: product management.
- `GET /api/v1/admin/categories`, `POST /api/v1/admin/categories`: category management.
- `GET /api/v1/admin/media`, `POST /api/v1/admin/media`, `DELETE /api/v1/admin/media/{media_id}`: protected media library/upload.
- `PUT /api/v1/admin/store/settings`: update store settings, social accounts and contact data.
- `GET /api/v1/admin/orders`, `PATCH /api/v1/admin/orders/{order_id}/status`: order listing and validated status changes.
- `GET /api/v1/admin/appointments`, `PATCH /api/v1/admin/appointments/{appointment_id}`: appointment review/status/reschedule.
- `GET /api/v1/admin/dashboard`: database aggregates; revenue counts only orders marked paid.

All admin routes require `Authorization: Bearer <token>` and server-side authorization. Online card payments and payment-provider callbacks are not implemented.
