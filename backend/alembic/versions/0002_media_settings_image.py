"""media, store settings, and primary product image URL"""
from alembic import op
from sqlalchemy import inspect
from app.models import MediaAsset, Product, StoreSettings

revision = "0002_media_settings_image"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if "image_url" not in {column["name"] for column in inspect(bind).get_columns("products")}:
        op.add_column("products", Product.__table__.c.image_url.copy())
    MediaAsset.__table__.create(bind=bind, checkfirst=True)
    StoreSettings.__table__.create(bind=bind, checkfirst=True)


def downgrade():
    bind = op.get_bind()
    StoreSettings.__table__.drop(bind=bind, checkfirst=True)
    MediaAsset.__table__.drop(bind=bind, checkfirst=True)
    if "image_url" in {column["name"] for column in inspect(bind).get_columns("products")}:
        op.drop_column("products", "image_url")
