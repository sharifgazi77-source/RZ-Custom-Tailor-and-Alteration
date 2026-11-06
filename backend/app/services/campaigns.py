from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

from ..models import Campaign, Product

STORE_TIMEZONE = ZoneInfo("America/Toronto")
CENT = Decimal("0.01")


def campaign_is_current(campaign: Campaign, today: date | None = None) -> bool:
    current_day = today or datetime.now(STORE_TIMEZONE).date()
    return (
        campaign.status == "published"
        and (campaign.starts_on is None or campaign.starts_on <= current_day)
        and (campaign.ends_on is None or campaign.ends_on >= current_day)
    )


def campaign_qualifies(campaign: Campaign, product: Product) -> bool:
    if product.sale_price is not None:
        return False  # Campaign discounts do not stack with an explicit product sale price.
    if not campaign.categories and not campaign.product_ids:
        return False
    return product.category in campaign.categories or product.id in campaign.product_ids


def item_campaign_discount(campaign: Campaign, price: Decimal, quantity: int) -> Decimal:
    if campaign.discount_type == "none":
        return Decimal("0.00")
    if campaign.discount_type == "percent":
        amount = price * campaign.discount_value / Decimal("100")
    else:
        amount = campaign.discount_value
    amount = amount.quantize(CENT, rounding=ROUND_HALF_UP)
    if campaign.maximum_discount is not None:
        amount = min(amount, campaign.maximum_discount)
    return min(amount, price) * quantity


def choose_campaign(campaigns: list[Campaign], lines: list[tuple[Product, int]], today: date | None = None):
    """Choose the single eligible campaign yielding greatest order savings; never stack campaigns."""
    current = [campaign for campaign in campaigns if campaign_is_current(campaign, today) and campaign.discount_type != "none"]
    candidates: list[tuple[Decimal, int, Campaign]] = []
    for campaign in current:
        eligible_lines = [(p, q) for p, q in lines if campaign_qualifies(campaign, p)]
        subtotal = sum(((p.sale_price or p.price) * q for p, q in eligible_lines), Decimal("0.00"))
        if subtotal < campaign.minimum_subtotal:
            continue
        savings = sum(
            (item_campaign_discount(campaign, p.price, q) for p, q in eligible_lines),
            Decimal("0.00"),
        )
        if savings > 0:
            candidates.append((savings, campaign.priority, campaign))
    if not candidates:
        return None, Decimal("0.00")
    savings, _, selected = max(candidates, key=lambda item: (item[0], item[1], -item[2].id))
    return selected, savings.quantize(CENT, rounding=ROUND_HALF_UP)
