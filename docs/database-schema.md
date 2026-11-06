# Database schema

SQLAlchemy models are in `backend/app/models.py`; Alembic owns schema upgrades. Monetary amounts use `Numeric(10,2)`. Datetimes are stored in UTC; campaign date-only windows are interpreted in the shop's `America/Toronto` timezone.

Current models cover users/roles, categories, products and configurable choices, customer profiles, orders/items, order-status history, appointments, media metadata, store settings, campaigns, product reviews and contact messages. Foreign keys link order items to products and customer/order records as implemented in the model layer. Media records hold metadata and storage keys, not image binaries in product rows.

## Campaign and order pricing

`campaigns` stores a unique slug, admin name, public title/message, optional display label, discount type/value/cap, minimum eligible subtotal, product/category scope, desktop/mobile image keys, CTA, start/end dates, draft/published/archived status, priority and timestamps. A discount campaign must target at least one product or category. Database values do not assume a 50% discount. Current campaigns are evaluated using Toronto calendar dates.

Orders store `subtotal`, `discount_amount`, `campaign_title` and the final `total`. The server chooses at most one eligible campaign and snapshots the outcome in the order; the browser preview is informational. Product sale prices are not combined with campaign discounts. The existing legacy `store_settings.seasonal_offers` JSON column remains for backward compatibility, but the Offers admin module and public campaign API use the normalized `campaigns` table.

Apply revisions from the repository root with `python -m alembic upgrade head`. Revision `0005_campaign_manager` creates the campaign table, adds order price snapshots, and assigns the fitting illustration as the fallback for empty hero settings. No payment card data is stored. Full payment-provider records/webhooks, normalized addresses, product variant/gallery ordering, measurement profiles, audit logs and several broad master-specification modules are not yet implemented; see the README and test report for scope status.
