from contextlib import asynccontextmanager
from datetime import timedelta, timezone
from decimal import Decimal
from pathlib import Path
import uuid
import secrets
import cloudinary
import cloudinary.uploader
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session
from .db import Base, engine, get_db, settings
from . import models
from .models import Appointment, Campaign, Category, ContactMessage, CustomerProfile, MediaAsset, Order, OrderItem, OrderStatusHistory, Product, ProductReview, StoreSettings, User
from .schemas import AppointmentAdminInput, AppointmentInput, CampaignInput, CampaignOut, CategoryInput, CheckoutInput, ContactInput, DashboardOut, ProductInput, ProductOut, ReviewInput, StatusInput, StoreSettingsInput
from .security import create_token, require_admin, verify_password
from .services.campaigns import campaign_is_current, campaign_qualifies, choose_campaign, item_campaign_discount


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Alembic owns schema lifecycle; create_all is limited to lightweight local startup.
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="RZ Custom Tailor API", version="0.1.0", lifespan=lifespan)
if settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret:
    cloudinary.config(cloud_name=settings.cloudinary_cloud_name, api_key=settings.cloudinary_api_key, api_secret=settings.cloudinary_api_secret, secure=True)
if not (settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret):
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings.allowed_origins.split(",")], allow_credentials=True, allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])
router_prefix = "/api/v1"


@app.get(f"{router_prefix}/health")
def health():
    return {"status": "ok"}


def settings_payload(settings_row: StoreSettings | None):
    if settings_row is None:
        return {"store_name": "RZ Custom Tailor & Alteration", "tagline": "Made for the moments that matter.", "hero_title": "RZ Custom Tailor & Alteration", "hero_description": "Premium tailoring for modern you.", "phone": "+1 (437) 484-8836", "secondary_phone": "+1 (437) 484-0482", "email": "info@rzcustomtailor.com", "address": "Unit # 211 B, 3028 Danforth Ave., Toronto, ON M4C 1N2", "logo_url": "/images/rz-logo.png", "hero_image_url": "/images/atelier-fitting.svg", "map_url": "https://maps.google.com/?q=3028+Danforth+Ave+Toronto+ON+M4C+1N2", "business_hours": {}, "social_links": {}, "seasonal_offers": {"black_friday": {"title": "Black Friday Offer", "message": "", "discount_text": "", "cta_label": "Shop offers", "cta_url": "/shop", "active": False, "starts_on": None, "ends_on": None}, "christmas": {"title": "Christmas Offer", "message": "", "discount_text": "", "cta_label": "Shop offers", "cta_url": "/shop", "active": False, "starts_on": None, "ends_on": None}}, "currency": "CAD"}
    return {key: getattr(settings_row, key) for key in StoreSettingsInput.model_fields}


@app.get(f"{router_prefix}/store/settings")
def public_store_settings(db: Session = Depends(get_db)):
    return settings_payload(db.get(StoreSettings, 1))


@app.get(f"{router_prefix}/store/reviews")
def public_reviews(db: Session = Depends(get_db)):
    return db.execute(select(ProductReview.id, ProductReview.customer_name, ProductReview.rating, ProductReview.body, Product.title, ProductReview.created_at).join(Product, Product.id == ProductReview.product_id).where(ProductReview.status == "published").order_by(ProductReview.created_at.desc()).limit(12)).mappings().all()


@app.get(f"{router_prefix}/campaigns", response_model=list[CampaignOut])
def public_campaigns(db: Session = Depends(get_db)):
    campaigns = db.scalars(select(Campaign).where(Campaign.status == "published").order_by(Campaign.priority.desc(), Campaign.id.desc())).all()
    return [campaign for campaign in campaigns if campaign_is_current(campaign)]


@app.get(f"{router_prefix}/admin/campaigns", response_model=list[CampaignOut])
def admin_campaigns(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.scalars(select(Campaign).order_by(Campaign.updated_at.desc(), Campaign.id.desc())).all()


def validate_campaign_scope(payload: CampaignInput, db: Session) -> None:
    if payload.product_ids:
        found = set(db.scalars(select(Product.id).where(Product.id.in_(payload.product_ids))).all())
        if found != set(payload.product_ids):
            raise HTTPException(status_code=422, detail="Campaign references a product that does not exist")
    if payload.categories:
        known = set(db.scalars(select(Product.category).distinct()).all())
        if set(payload.categories) - known:
            raise HTTPException(status_code=422, detail="Campaign references a category with no products")
    if not payload.categories and not payload.product_ids and payload.discount_type != "none":
        raise HTTPException(status_code=422, detail="Choose at least one eligible category or product for a discount campaign")


@app.post(f"{router_prefix}/admin/campaigns", response_model=CampaignOut, status_code=201)
def create_campaign(payload: CampaignInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    validate_campaign_scope(payload, db)
    if db.scalar(select(Campaign.id).where(Campaign.slug == payload.slug)):
        raise HTTPException(status_code=409, detail="A campaign with this slug already exists")
    campaign = Campaign(**payload.model_dump())
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@app.patch(f"{router_prefix}/admin/campaigns/{{campaign_id}}", response_model=CampaignOut)
def update_campaign(campaign_id: int, payload: CampaignInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    validate_campaign_scope(payload, db)
    duplicate = db.scalar(select(Campaign.id).where(Campaign.slug == payload.slug, Campaign.id != campaign_id))
    if duplicate:
        raise HTTPException(status_code=409, detail="A campaign with this slug already exists")
    for key, value in payload.model_dump().items():
        setattr(campaign, key, value)
    db.commit()
    db.refresh(campaign)
    return campaign


@app.post(f"{router_prefix}/contact", status_code=201)
def send_contact_message(payload: ContactInput, db: Session = Depends(get_db)):
    message = ContactMessage(name=payload.name, email=payload.email.lower(), message=payload.message)
    db.add(message)
    db.commit()
    return {"status": "received"}


@app.get(f"{router_prefix}/admin/contact-messages")
def admin_contact_messages(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.scalars(select(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(200)).all()


@app.get(f"{router_prefix}/admin/reviews")
def admin_reviews(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(select(ProductReview.id, ProductReview.customer_name, ProductReview.rating, ProductReview.body, ProductReview.status, Product.title, ProductReview.created_at).join(Product, Product.id == ProductReview.product_id).order_by(ProductReview.created_at.desc()).limit(200)).mappings().all()
    return rows


@app.patch(f"{router_prefix}/admin/reviews/{{review_id}}")
def moderate_review(review_id: int, payload: StatusInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    review = db.get(ProductReview, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    if payload.status not in {"pending", "published", "rejected"}:
        raise HTTPException(status_code=422, detail="Invalid review status")
    review.status = payload.status
    db.commit()
    return {"id": review.id, "status": review.status}


@app.put(f"{router_prefix}/admin/store/settings")
def save_store_settings(payload: StoreSettingsInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.get(StoreSettings, 1)
    if row is None:
        row = StoreSettings(id=1, **payload.model_dump())
        db.add(row)
    else:
        for key, value in payload.model_dump().items():
            setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return settings_payload(row)


@app.post(f"{router_prefix}/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == form.username.lower()))
    if not user or user.role != "admin" or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    return {"access_token": create_token(user), "token_type": "bearer"}


@app.get(f"{router_prefix}/products", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.scalars(select(Product).where(Product.status == "published").order_by(Product.created_at.desc())).all()


@app.get(f"{router_prefix}/admin/products", response_model=list[ProductOut])
def admin_products(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.scalars(select(Product).order_by(Product.created_at.desc())).all()


@app.post(f"{router_prefix}/admin/products", response_model=ProductOut, status_code=201)
def create_product(payload: ProductInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.scalar(select(Product.id).where(Product.slug == payload.slug)):
        raise HTTPException(status_code=409, detail="A product with this slug already exists")
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@app.patch(f"{router_prefix}/admin/products/{{product_id}}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    duplicate = db.scalar(select(Product.id).where(Product.slug == payload.slug, Product.id != product_id))
    if duplicate:
        raise HTTPException(status_code=409, detail="A product with this slug already exists")
    for key, value in payload.model_dump().items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@app.get(f"{router_prefix}/categories")
def public_categories(db: Session = Depends(get_db)):
    return db.scalars(select(Category).order_by(Category.name)).all()


@app.get(f"{router_prefix}/admin/categories")
def admin_categories(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.scalars(select(Category).order_by(Category.name)).all()


@app.post(f"{router_prefix}/admin/categories", status_code=201)
def create_category(payload: CategoryInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.scalar(select(Category.id).where((Category.name == payload.name) | (Category.slug == payload.slug))):
        raise HTTPException(status_code=409, detail="Category name or slug already exists")
    category = Category(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@app.post(f"{router_prefix}/admin/media", status_code=201)
async def upload_media(request: Request, file: UploadFile = File(...), admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    allowed = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG and WebP images are accepted")
    payload = await file.read(settings.max_upload_bytes + 1)
    if not payload or len(payload) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Image is empty or exceeds the configured upload limit")
    # Verify image bytes before passing the upload to a storage provider.
    try:
        from PIL import Image
        from io import BytesIO
        image = Image.open(BytesIO(payload))
        image.verify()
        if image.format not in {"JPEG", "PNG", "WEBP"}:
            raise ValueError("Unsupported image format")
    except Exception as exc:
        raise HTTPException(status_code=415, detail="File contents are not a valid supported image") from exc
    asset_id = uuid.uuid4().hex
    ext = allowed[file.content_type]
    original = Path(file.filename or f"upload{ext}").name[:180]
    if settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret:
        result = cloudinary.uploader.upload(payload, public_id=f"rz-custom-tailor/{asset_id}", resource_type="image", overwrite=False)
        storage_key, url = result["public_id"], result["secure_url"]
    else:
        folder = Path(settings.upload_dir)
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / f"{asset_id}{ext}"
        target.write_bytes(payload)
        storage_key, url = target.name, f"{str(request.base_url).rstrip('/')}/uploads/{target.name}"
    asset = MediaAsset(filename=original, storage_key=storage_key, url=url, content_type=file.content_type, size_bytes=len(payload), created_by=admin.id)
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return {"id": asset.id, "filename": asset.filename, "storage_key": asset.storage_key, "url": asset.url, "content_type": asset.content_type, "size_bytes": asset.size_bytes}


@app.get(f"{router_prefix}/admin/media")
def list_media(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.scalars(select(MediaAsset).order_by(MediaAsset.created_at.desc()).limit(500)).all()


@app.delete(f"{router_prefix}/admin/media/{{media_id}}", status_code=204)
def delete_media(media_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    asset = db.get(MediaAsset, media_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Media asset not found")
    if settings.cloudinary_cloud_name and asset.storage_key.startswith("rz-custom-tailor/"):
        cloudinary.uploader.destroy(asset.storage_key, resource_type="image", invalidate=True)
    else:
        folder = Path(settings.upload_dir).resolve()
        target = (folder / asset.storage_key).resolve()
        if target.parent == folder:
            target.unlink(missing_ok=True)
    db.delete(asset)
    db.commit()
    return None


@app.post(f"{router_prefix}/orders", status_code=201)
def create_order(payload: CheckoutInput, db: Session = Depends(get_db)):
    product_ids = {line.product_id for line in payload.items}
    products = {product.id: product for product in db.scalars(select(Product).where(Product.id.in_(product_ids), Product.status == "published").with_for_update()).all()}
    if len(products) != len(product_ids):
        raise HTTPException(status_code=422, detail="One or more products are unavailable")
    quantities: dict[int, int] = {}
    for line in payload.items:
        product = products[line.product_id]
        quantities[line.product_id] = quantities.get(line.product_id, 0) + line.quantity
        for field, selected in (("size", line.size), ("color", line.color), ("fabric", line.fabric)):
            options = getattr(product, {"size": "sizes", "color": "colors", "fabric": "fabrics"}[field])
            if selected and options and selected not in options:
                raise HTTPException(status_code=422, detail=f"Selected {field} is unavailable for {product.title}")
        if product.kind == "custom" and not line.size and not line.measurements:
            raise HTTPException(status_code=422, detail=f"Choose a size or add measurements for {product.title}")
    for product_id, quantity in quantities.items():
        product = products[product_id]
        if product.kind == "ready_made" and product.stock < quantity:
            raise HTTPException(status_code=409, detail=f"Insufficient stock for {product.title}")
    order_lines = [(products[line.product_id], line.quantity) for line in payload.items]
    available_campaigns = db.scalars(select(Campaign).where(Campaign.status == "published")).all()
    selected_campaign, discount_total = choose_campaign(available_campaigns, order_lines)
    subtotal = sum(((product.sale_price or product.price) * quantity for product, quantity in order_lines), Decimal("0.00"))
    order_number = f"RZ-{uuid.uuid4().hex[:10].upper()}"
    order = Order(order_number=order_number, customer_name=payload.customer_name, customer_email=payload.customer_email.lower(), customer_phone=payload.customer_phone, shipping_address=payload.shipping_address, shipping_city=payload.shipping_city, shipping_postal_code=payload.shipping_postal_code, payment_method="cash_on_delivery", payment_status="unpaid", status="pending", subtotal=subtotal, discount_amount=discount_total, campaign_title=selected_campaign.title if selected_campaign else "", total=subtotal - discount_total)
    db.add(order)
    for line in payload.items:
        product = products[line.product_id]
        unit_price = product.sale_price or product.price
        options = {key: value for key, value in {"size": line.size, "color": line.color, "fabric": line.fabric, "fit": line.fit, "measurements": line.measurements, "tailoring_notes": line.tailoring_notes}.items() if value not in (None, "", {})}
        if selected_campaign and campaign_qualifies(selected_campaign, product):
            options["campaign_title"] = selected_campaign.title
            options["campaign_discount"] = str(item_campaign_discount(selected_campaign, unit_price, line.quantity))
        db.add(OrderItem(order=order, product_id=product.id, title=product.title, quantity=line.quantity, unit_price=unit_price, options=options))
    for product_id, quantity in quantities.items():
        if products[product_id].kind == "ready_made":
            products[product_id].stock -= quantity
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"order_number": order.order_number, "status": order.status, "payment_status": order.payment_status, "subtotal": str(order.subtotal), "discount_amount": str(order.discount_amount), "campaign_title": order.campaign_title, "total": str(order.total)}


def serialize_order(order: Order):
    return {"id": order.id, "order_number": order.order_number, "customer_name": order.customer_name, "customer_email": order.customer_email, "customer_phone": order.customer_phone, "shipping_address": order.shipping_address, "shipping_city": order.shipping_city, "shipping_postal_code": order.shipping_postal_code, "status": order.status, "payment_status": order.payment_status, "payment_method": order.payment_method, "subtotal": str(order.subtotal), "discount_amount": str(order.discount_amount), "campaign_title": order.campaign_title, "total": str(order.total), "created_at": order.created_at.isoformat(), "items": [{"title": item.title, "quantity": item.quantity, "unit_price": str(item.unit_price), "options": item.options} for item in order.items]}


@app.get(f"{router_prefix}/admin/orders")
def admin_orders(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.scalars(select(Order).order_by(Order.created_at.desc()).limit(500)).all()
    return [serialize_order(order) for order in rows]


ORDER_TRANSITIONS = {"pending": {"confirmed", "cancelled"}, "confirmed": {"processing", "cancelled"}, "processing": {"shipped", "cancelled"}, "shipped": {"delivered"}, "delivered": set(), "cancelled": set()}


@app.patch(f"{router_prefix}/admin/orders/{{order_id}}/status")
def update_order_status(order_id: int, payload: StatusInput, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if payload.status not in ORDER_TRANSITIONS.get(order.status, set()):
        raise HTTPException(status_code=409, detail=f"Invalid transition from {order.status} to {payload.status}")
    old = order.status
    order.status = payload.status
    db.add(OrderStatusHistory(order_id=order.id, old_status=old, new_status=payload.status, changed_by=admin.id))
    db.commit()
    return {"order_number": order.order_number, "status": order.status}


@app.post(f"{router_prefix}/appointments", status_code=201)
def request_appointment(payload: AppointmentInput, db: Session = Depends(get_db)):
    starts = payload.starts_at.astimezone(timezone.utc)
    lower, upper = starts - timedelta(minutes=59), starts + timedelta(minutes=59)
    conflict = db.scalar(select(Appointment.id).where(Appointment.status != "cancelled", Appointment.starts_at >= lower, Appointment.starts_at <= upper))
    if conflict:
        raise HTTPException(status_code=409, detail="That fitting time is unavailable; choose another slot")
    appointment = Appointment(customer_name=payload.customer_name, customer_email=payload.customer_email.lower(), customer_phone=payload.customer_phone, service=payload.service, starts_at=starts, notes=payload.notes, status="requested")
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return {"id": appointment.id, "status": appointment.status, "starts_at": appointment.starts_at.isoformat()}


@app.get(f"{router_prefix}/admin/appointments")
def admin_appointments(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.scalars(select(Appointment).order_by(Appointment.starts_at.desc()).limit(500)).all()


@app.patch(f"{router_prefix}/admin/appointments/{{appointment_id}}")
def update_appointment(appointment_id: int, payload: AppointmentAdminInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if payload.starts_at is not None:
        starts = payload.starts_at.astimezone(timezone.utc)
        lower, upper = starts - timedelta(minutes=59), starts + timedelta(minutes=59)
        conflict = db.scalar(select(Appointment.id).where(Appointment.id != appointment.id, Appointment.status != "cancelled", Appointment.starts_at >= lower, Appointment.starts_at <= upper))
        if conflict:
            raise HTTPException(status_code=409, detail="That fitting time is unavailable")
        appointment.starts_at = starts
        if payload.status == "confirmed":
            appointment.status = "rescheduled"
        else:
            appointment.status = payload.status
    else:
        appointment.status = payload.status
    db.commit()
    return {"id": appointment.id, "status": appointment.status, "starts_at": appointment.starts_at.isoformat()}


@app.get(f"{router_prefix}/admin/dashboard", response_model=DashboardOut)
def dashboard(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    counts = dict(db.execute(select(Order.status, func.count(Order.id)).group_by(Order.status)).all())
    revenue = db.scalar(select(func.coalesce(func.sum(Order.total), 0)).where(Order.payment_status == "paid")) or Decimal("0.00")
    months = db.execute(select(extract("month", Order.created_at).label("month"), func.sum(Order.total)).where(Order.payment_status == "paid", extract("year", Order.created_at) == func.extract("year", func.current_date())).group_by("month")).all()
    month_totals = {int(month): float(total) for month, total in months}
    recent = db.scalars(select(Order).order_by(Order.created_at.desc()).limit(5)).all()
    recent_orders = [{"id": order.order_number, "customer": order.user_id and db.get(User, order.user_id).email or "Guest customer", "item": "Order details", "date": order.created_at.isoformat(), "total": float(order.total), "status": order.status.replace("_", " ").title()} for order in recent]
    return DashboardOut(total_products=db.scalar(select(func.count(Product.id))) or 0, total_orders=db.scalar(select(func.count(Order.id))) or 0, total_customers=db.scalar(select(func.count(CustomerProfile.id))) or 0, revenue=revenue, status_counts=counts, recent_orders=recent_orders, monthly_revenue=[{"month": i, "sales": month_totals.get(i, 0)} for i in range(1, 13)])
