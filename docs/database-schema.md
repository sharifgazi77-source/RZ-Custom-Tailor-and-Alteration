# Database schema

The initial migration defines users with administrator/customer role, categories, products, customer profiles, orders, order items, and appointments. Money uses fixed precision decimal columns. Product slugs, user email, order numbers, order status, payment status, and appointment start times are indexed or unique as appropriate. Timestamps are written as UTC-aware values by the application.

The complete requested production schema still needs payments, addresses, product images/variants/options, tailoring requests, measurements, media assets, content/settings, order status history, and audit logs before launch.
