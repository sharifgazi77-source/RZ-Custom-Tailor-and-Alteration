from decimal import Decimal
from datetime import date, datetime, timezone
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ProductInput(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    slug: str = Field(min_length=2, max_length=200, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str = Field(default="", max_length=10000)
    category: str = Field(default="Uncategorized", max_length=100)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    sale_price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    sku: str | None = Field(default=None, max_length=80)
    stock: int = Field(default=0, ge=0)
    status: Literal["draft", "published", "archived"] = "draft"
    kind: Literal["ready_made", "custom"] = "ready_made"
    sizes: list[str] = Field(default_factory=list, max_length=20)
    colors: list[str] = Field(default_factory=list, max_length=30)
    fabrics: list[str] = Field(default_factory=list, max_length=30)
    featured: bool = False
    image_url: str | None = Field(default=None, max_length=1000)

    @field_validator("sale_price")
    @classmethod
    def sale_must_be_less_than_regular(cls, value: Decimal | None, info):
        regular = info.data.get("price")
        if value is not None and regular is not None and value >= regular:
            raise ValueError("Sale price must be lower than regular price")
        return value


class ProductOut(ProductInput):
    model_config = ConfigDict(from_attributes=True)
    id: int


class CampaignInput(BaseModel):
    slug: str = Field(min_length=3, max_length=140, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: str = Field(min_length=2, max_length=140)
    title: str = Field(min_length=2, max_length=180)
    message: str = Field(default="", max_length=2000)
    discount_type: Literal["none", "percent", "fixed"] = "percent"
    discount_value: Decimal = Field(default=Decimal("0"), ge=0, max_digits=10, decimal_places=2)
    discount_label: str = Field(default="", max_length=80)
    maximum_discount: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    minimum_subtotal: Decimal = Field(default=Decimal("0"), ge=0, max_digits=10, decimal_places=2)
    categories: list[str] = Field(default_factory=list, max_length=50)
    product_ids: list[int] = Field(default_factory=list, max_length=200)
    banner_url: str = Field(default="", max_length=1000)
    mobile_banner_url: str = Field(default="", max_length=1000)
    cta_label: str = Field(default="Shop offer", min_length=1, max_length=40)
    cta_url: str = Field(default="/shop", max_length=500)
    starts_on: date | None = None
    ends_on: date | None = None
    status: Literal["draft", "published", "archived"] = "draft"
    priority: int = Field(default=0, ge=0, le=1000)

    @field_validator("cta_url")
    @classmethod
    def safe_campaign_link(cls, value: str) -> str:
        if value.startswith("/") and not value.startswith("//") or value.startswith("https://"):
            return value
        raise ValueError("Campaign button link must be a site path or HTTPS URL")

    @model_validator(mode="after")
    def valid_campaign_rules(self):
        if self.starts_on and self.ends_on and self.ends_on < self.starts_on:
            raise ValueError("Campaign end date must be on or after its start date")
        if self.discount_type == "percent" and self.discount_value > 100:
            raise ValueError("Percentage discount cannot exceed 100")
        if self.discount_type == "none" and self.discount_value != 0:
            raise ValueError("A display-only campaign must have a zero discount value")
        if self.discount_type != "none" and self.discount_value <= 0:
            raise ValueError("Enter a positive discount amount")
        return self


class CampaignOut(CampaignInput):
    model_config = ConfigDict(from_attributes=True)
    id: int


class DashboardOut(BaseModel):
    total_products: int
    total_orders: int
    total_customers: int
    revenue: Decimal
    status_counts: dict[str, int]
    recent_orders: list[dict]
    monthly_revenue: list[dict]


class SeasonalOfferInput(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    message: str = Field(default="", max_length=500)
    discount_text: str = Field(default="", max_length=80)
    cta_label: str = Field(default="Shop offers", max_length=40)
    cta_url: str = Field(default="/shop", max_length=500)
    active: bool = False
    starts_on: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    ends_on: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")

    @field_validator("starts_on", "ends_on")
    @classmethod
    def valid_calendar_date(cls, value: str | None) -> str | None:
        if value is not None:
            datetime.strptime(value, "%Y-%m-%d")
        return value

    @field_validator("cta_url")
    @classmethod
    def safe_cta_url(cls, value: str) -> str:
        if value.startswith("/") or value.startswith("https://"):
            return value
        raise ValueError("Offer link must be a site path or an HTTPS URL")

    @model_validator(mode="after")
    def valid_date_range(self):
        if self.starts_on and self.ends_on and self.ends_on < self.starts_on:
            raise ValueError("Offer end date must be on or after its start date")
        return self


class SeasonalOffersInput(BaseModel):
    black_friday: SeasonalOfferInput = Field(default_factory=lambda: SeasonalOfferInput(title="Black Friday Offer"))
    christmas: SeasonalOfferInput = Field(default_factory=lambda: SeasonalOfferInput(title="Christmas Offer"))


class StoreSettingsInput(BaseModel):
    store_name: str = Field(min_length=2, max_length=160)
    tagline: str = Field(max_length=250)
    hero_title: str = Field(max_length=250)
    hero_description: str = Field(max_length=2000)
    phone: str = Field(default="", max_length=50)
    secondary_phone: str = Field(default="", max_length=50)
    email: str = Field(default="", max_length=255)
    address: str = Field(default="", max_length=500)
    logo_url: str = Field(default="", max_length=1000)
    hero_image_url: str = Field(default="", max_length=1000)
    map_url: str = Field(default="", max_length=1000)
    business_hours: dict[str, str] = Field(default_factory=dict)
    social_links: dict[str, str] = Field(default_factory=dict)
    seasonal_offers: SeasonalOffersInput = Field(default_factory=SeasonalOffersInput)
    currency: str = Field(default="USD", min_length=3, max_length=3)

    @field_validator("currency")
    @classmethod
    def upper_currency(cls, value: str) -> str:
        return value.upper()


class OrderLineInput(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=20)
    size: str | None = Field(default=None, max_length=40)
    color: str | None = Field(default=None, max_length=60)
    fabric: str | None = Field(default=None, max_length=100)
    fit: str | None = Field(default=None, max_length=40)
    measurements: dict[str, str] = Field(default_factory=dict)
    tailoring_notes: str = Field(default="", max_length=2000)


class CheckoutInput(BaseModel):
    customer_name: str = Field(min_length=2, max_length=180)
    customer_email: str = Field(min_length=5, max_length=255)
    customer_phone: str = Field(min_length=7, max_length=50)
    shipping_address: str = Field(min_length=5, max_length=1000)
    shipping_city: str = Field(min_length=2, max_length=120)
    shipping_postal_code: str = Field(min_length=2, max_length=40)
    payment_method: Literal["cash_on_delivery"] = "cash_on_delivery"
    items: list[OrderLineInput] = Field(min_length=1, max_length=30)


class AppointmentInput(BaseModel):
    customer_name: str = Field(min_length=2, max_length=180)
    customer_email: str = Field(min_length=5, max_length=255)
    customer_phone: str = Field(min_length=7, max_length=50)
    service: Literal["custom_tailoring", "alteration", "consultation"]
    starts_at: datetime
    notes: str = Field(default="", max_length=2000)

    @field_validator("starts_at")
    @classmethod
    def appointment_must_be_future_and_timezone_aware(cls, value: datetime):
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Appointment time must include a timezone")
        if value <= datetime.now(timezone.utc):
            raise ValueError("Appointment time must be in the future")
        return value


class StatusInput(BaseModel):
    status: str = Field(min_length=2, max_length=30)


class CategoryInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    slug: str = Field(min_length=2, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class AppointmentAdminInput(BaseModel):
    status: Literal["requested", "confirmed", "rescheduled", "cancelled", "completed"]
    starts_at: datetime | None = None

    @field_validator("starts_at")
    @classmethod
    def rescheduled_time_must_be_future_and_aware(cls, value: datetime | None):
        if value is not None and (value.tzinfo is None or value.utcoffset() is None or value <= datetime.now(timezone.utc)):
            raise ValueError("Rescheduled appointment must be a future timezone-aware time")
        return value


class ReviewInput(BaseModel):
    product_id: int = Field(gt=0)
    customer_name: str = Field(min_length=2, max_length=120)
    rating: int = Field(ge=1, le=5)
    body: str = Field(min_length=10, max_length=2000)


class ContactInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    message: str = Field(min_length=10, max_length=3000)
