from datetime import date
from decimal import Decimal

from app.models import Campaign, Product
from app.services.campaigns import campaign_is_current, choose_campaign, item_campaign_discount


def make_product(product_id: int, *, category: str, price: str, sale_price: str | None = None):
    return Product(
        id=product_id,
        title=f"Product {product_id}",
        slug=f"product-{product_id}",
        category=category,
        price=Decimal(price),
        sale_price=Decimal(sale_price) if sale_price else None,
        stock=5,
        status="published",
        kind="ready_made",
        sizes=[],
        colors=[],
        fabrics=[],
        featured=False,
    )


def make_campaign(**changes):
    fields = {
        "id": 1,
        "slug": "winter-sale",
        "name": "Winter sale",
        "title": "Winter offer",
        "message": "Owner-approved winter discount",
        "discount_type": "percent",
        "discount_value": Decimal("20.00"),
        "discount_label": "20% off",
        "maximum_discount": None,
        "minimum_subtotal": Decimal("0.00"),
        "categories": ["Suits"],
        "product_ids": [],
        "banner_url": "",
        "mobile_banner_url": "",
        "cta_label": "Shop offer",
        "cta_url": "/shop",
        "starts_on": None,
        "ends_on": None,
        "status": "published",
        "priority": 0,
    }
    fields.update(changes)
    return Campaign(**fields)


def test_campaign_dates_include_start_and_end_days():
    campaign = make_campaign(starts_on=date(2026, 11, 1), ends_on=date(2026, 11, 5))
    assert campaign_is_current(campaign, date(2026, 11, 1))
    assert campaign_is_current(campaign, date(2026, 11, 5))
    assert not campaign_is_current(campaign, date(2026, 11, 6))


def test_checkout_selects_one_best_campaign_and_ignores_sale_price_items():
    suit = make_product(1, category="Suits", price="200.00")
    sale_blazer = make_product(2, category="Blazers", price="300.00", sale_price="250.00")
    smaller = make_campaign(id=1, discount_value=Decimal("10.00"))
    better = make_campaign(id=2, slug="tailoring-week", title="Tailoring week", discount_value=Decimal("25.00"), priority=1)

    chosen, discount = choose_campaign([smaller, better], [(suit, 1), (sale_blazer, 1)], date(2026, 11, 5))

    assert chosen.id == 2
    assert discount == Decimal("50.00")


def test_discount_cap_and_minimum_subtotal_are_respected():
    product = make_product(3, category="Suits", price="200.00")
    campaign = make_campaign(maximum_discount=Decimal("30.00"), minimum_subtotal=Decimal("250.00"))
    assert item_campaign_discount(campaign, product.price, 2) == Decimal("60.00")
    chosen, discount = choose_campaign([campaign], [(product, 1)], date(2026, 11, 5))
    assert chosen is None
    assert discount == Decimal("0.00")


def test_display_only_or_unscoped_campaign_never_changes_order_price():
    product = make_product(4, category="Suits", price="100.00")
    display_only = make_campaign(discount_type="none", discount_value=Decimal("0.00"))
    unscoped = make_campaign(id=2, categories=[], product_ids=[])
    chosen, discount = choose_campaign([display_only, unscoped], [(product, 1)], date(2026, 11, 5))
    assert chosen is None
    assert discount == Decimal("0.00")
