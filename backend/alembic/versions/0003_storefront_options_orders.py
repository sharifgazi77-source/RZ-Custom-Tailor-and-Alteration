"""storefront product choices, order contacts, appointments and content models"""
from alembic import op
from sqlalchemy import inspect, update
from app.models import ContactMessage, OrderItem, OrderStatusHistory, Product, ProductReview, StoreSettings, Order, Appointment

revision = "0003_storefront_options_orders"
down_revision = "0002_media_settings_image"
branch_labels = None
depends_on = None


def add_missing_columns(table):
    bind = op.get_bind()
    present = {column["name"] for column in inspect(bind).get_columns(table.name)}
    for column in table.columns:
        if column.name not in present:
            migrated_column = column.copy()
            migrated_column.nullable = True
            migrated_column.unique = False
            op.add_column(table.name, migrated_column)


def upgrade():
    for table in (Product.__table__, Order.__table__, OrderItem.__table__, Appointment.__table__, StoreSettings.__table__):
        add_missing_columns(table)
    backfills = {
        "products": {"kind": "ready_made", "sizes": [], "colors": [], "fabrics": [], "featured": False},
        "orders": {"customer_name": "", "customer_email": "", "customer_phone": "", "shipping_address": "", "shipping_city": "", "shipping_postal_code": "", "payment_method": "cash_on_delivery"},
        "order_items": {"options": {}},
        "appointments": {"customer_email": "", "customer_phone": "", "service": "custom_tailoring", "notes": ""},
        "store_settings": {"secondary_phone": "+1 (437) 484-0482", "logo_url": "/images/rz-logo.png", "hero_image_url": "", "map_url": "https://maps.google.com/?q=3028+Danforth+Ave+Toronto+ON+M4C+1N2"},
    }
    bind = op.get_bind()
    for table_name, values in backfills.items():
        table = Product.__table__.metadata.tables[table_name]
        for column_name, default_value in values.items():
            column = table.c[column_name]
            bind.execute(update(table).where(column.is_(None)).values({column_name: default_value}))
    for table in (OrderStatusHistory.__table__, ProductReview.__table__, ContactMessage.__table__):
        table.create(bind=bind, checkfirst=True)


def downgrade():
    bind = op.get_bind()
    for table in (ContactMessage.__table__, ProductReview.__table__, OrderStatusHistory.__table__):
        table.drop(bind=bind, checkfirst=True)
