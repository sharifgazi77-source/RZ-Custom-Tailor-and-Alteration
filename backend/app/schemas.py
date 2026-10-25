from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProductInput(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    slug: str = Field(min_length=2, max_length=200, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str = Field(default="", max_length=10000)
    category: str = Field(default="Uncategorized", max_length=100)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    stock: int = Field(default=0, ge=0)
    status: Literal["draft", "published", "archived"] = "draft"
    image_url: str | None = Field(default=None, max_length=1000)


class ProductOut(ProductInput):
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


class StoreSettingsInput(BaseModel):
    store_name: str = Field(min_length=2, max_length=160)
    tagline: str = Field(max_length=250)
    hero_title: str = Field(max_length=250)
    hero_description: str = Field(max_length=2000)
    phone: str = Field(default="", max_length=50)
    email: str = Field(default="", max_length=255)
    address: str = Field(default="", max_length=500)
    business_hours: dict[str, str] = Field(default_factory=dict)
    social_links: dict[str, str] = Field(default_factory=dict)
    currency: str = Field(default="USD", min_length=3, max_length=3)

    @field_validator("currency")
    @classmethod
    def upper_currency(cls, value: str) -> str:
        return value.upper()
