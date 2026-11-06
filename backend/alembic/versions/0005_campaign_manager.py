"""campaign manager and auditable campaign order totals"""

from alembic import op
from sqlalchemy import Column, Numeric, String, inspect, text

from app.models import Campaign

revision = "0005_campaign_manager"
down_revision = "0004_seasonal_offers"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    Campaign.__table__.create(bind=bind, checkfirst=True)
    columns = {column["name"] for column in inspect(bind).get_columns("orders")}
    additions = (
        Column("subtotal", Numeric(10, 2), nullable=True),
        Column("discount_amount", Numeric(10, 2), nullable=True),
        Column("campaign_title", String(180), nullable=True),
    )
    for column in additions:
        if column.name not in columns:
            op.add_column("orders", column)
    bind.execute(text("UPDATE orders SET subtotal = total WHERE subtotal IS NULL"))
    bind.execute(text("UPDATE orders SET discount_amount = 0 WHERE discount_amount IS NULL"))
    bind.execute(text("UPDATE orders SET campaign_title = '' WHERE campaign_title IS NULL"))
    settings_columns = {column["name"] for column in inspect(bind).get_columns("store_settings")}
    if "hero_image_url" in settings_columns:
        bind.execute(text("UPDATE store_settings SET hero_image_url = '/images/atelier-fitting.svg' WHERE hero_image_url IS NULL OR hero_image_url = ''"))


def downgrade():
    bind = op.get_bind()
    columns = {column["name"] for column in inspect(bind).get_columns("orders")}
    for name in ("campaign_title", "discount_amount", "subtotal"):
        if name in columns:
            op.drop_column("orders", name)
    Campaign.__table__.drop(bind=bind, checkfirst=True)
