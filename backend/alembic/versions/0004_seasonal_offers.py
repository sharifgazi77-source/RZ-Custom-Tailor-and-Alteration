"""add editable seasonal promotion settings"""

from alembic import op
from sqlalchemy import JSON, Column, inspect, text

revision = "0004_seasonal_offers"
down_revision = "0003_storefront_options_orders"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    columns = {column["name"] for column in inspect(bind).get_columns("store_settings")}
    if "seasonal_offers" not in columns:
        op.add_column("store_settings", Column("seasonal_offers", JSON, nullable=True))
    # Seed only inactive editable placeholders; no discount or dates are assumed.
    default_offers = (
        '{"black_friday":{"title":"Black Friday Offer","message":"","discount_text":"",'
        '"cta_label":"Shop offers","cta_url":"/shop","active":false,"starts_on":null,"ends_on":null},'
        '"christmas":{"title":"Christmas Offer","message":"","discount_text":"",'
        '"cta_label":"Shop offers","cta_url":"/shop","active":false,"starts_on":null,"ends_on":null}}'
    )
    if bind.dialect.name == "postgresql":
        bind.execute(text("UPDATE store_settings SET seasonal_offers = CAST(:payload AS JSON) WHERE seasonal_offers IS NULL"), {"payload": default_offers})
    else:
        bind.execute(text("UPDATE store_settings SET seasonal_offers = :payload WHERE seasonal_offers IS NULL"), {"payload": default_offers})


def downgrade():
    columns = {column["name"] for column in inspect(op.get_bind()).get_columns("store_settings")}
    if "seasonal_offers" in columns:
        op.drop_column("store_settings", "seasonal_offers")
