# API

FastAPI publishes interactive OpenAPI docs at `/docs` when running locally.

- `GET /api/v1/health`: public liveness check.
- `POST /api/v1/auth/login`: OAuth2 form fields `username` (email) and `password`; returns a bearer token for administrator users.
- `GET /api/v1/products`: public published products.
- `GET /api/v1/store/settings`: public store identity and contact settings.
- `GET /api/v1/admin/products`: administrator product listing.
- `POST /api/v1/admin/products`: administrator product creation.
- `PATCH /api/v1/admin/products/{product_id}`: administrator product update.
- `POST /api/v1/admin/media`: administrator image upload (JPEG, PNG or WebP; max size configurable).
- `PUT /api/v1/admin/store/settings`: administrator store settings update.
- `GET /api/v1/admin/dashboard`: administrator aggregate totals, paid revenue, monthly revenue, order statuses and recent orders.

Admin operations require `Authorization: Bearer <token>`. Payment is only counted as revenue when an order's `payment_status` is `paid`; no payment workflow is present yet.
