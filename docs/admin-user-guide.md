# Admin user guide

## Campaigns and seasonal offers

Open **Admin → Offers**. Choose **New campaign**, then enter a campaign name, public title and customer-facing message. The campaign name is for the admin list; the title/message appear on the website.

1. Choose **Display only**, **Percentage off**, or **Fixed amount off per item**. Only enter a discount approved by the owner.
2. For a discount, select at least one eligible category or product. Products already using a sale price are excluded from campaign discounts so discounts do not stack.
3. Optionally set the minimum eligible subtotal and a per-item maximum discount.
4. Add a start/end date. Dates use the shop's `America/Toronto` calendar. Leave a date empty for an open boundary; an end date before a start date is rejected.
5. Set a button label and a safe destination such as `/shop`. External destinations must use HTTPS.
6. Upload desktop and, optionally, mobile campaign artwork. Use artwork you own or have permission to use. Text remains HTML so it can be read on mobile and assistive technology.
7. Save as a draft, or publish when the owner-approved offer is ready. Use **Edit** to change or archive an offer.

Published in-date campaigns appear in a slim strip just below the public navigation and in the **Current Offers** section immediately below the tailor-measuring hero. Multiple offers appear as cards; on phones customers can swipe through them. The campaign CTA links to its configured destination.

At checkout, the backend recalculates the discount against the current database prices. Only one qualifying campaign applies per order; the one producing the greatest saving is selected, with priority as the tie-breaker. Product sale prices do not combine with a campaign. The order stores its subtotal, discount, campaign title and final total. A campaign label alone does not verify payment; COD orders remain unpaid.

## Store settings and social links

Open **Store settings** to change the store name, tagline, home hero title/copy, logo, fitting hero image, address, map, phone numbers, email, opening hours, currency and social links. TikTok, Facebook, Instagram, YouTube and LinkedIn links are supported. Save after changing settings. Only provide the shop's verified contact and social URLs.

## Products, media, orders and appointments

- **Products:** create or edit products, category, ready-to-wear/custom type, price, optional sale price, stock, sizes, colors, fabric choices, featured state, tags and publication status.
- **Media:** upload supported image formats from a desktop or mobile picker; uploads are restricted to admin users and stored as media records with storage keys.
- **Orders:** inspect the order record and set a permitted fulfillment status. The backend records status history. Do not mark an order paid without trusted confirmation.
- **Appointments:** inspect appointment requests and update their status/time. The API rejects overlapping appointments.

## First administrator

Set a unique admin email, strong password and secret in the ignored local `.env`, then run `bootstrap-admin.ps1` once. Never share the admin password or commit `.env` files. A production bootstrap should use a newly generated password and secrets held in the hosting provider's secret manager.
