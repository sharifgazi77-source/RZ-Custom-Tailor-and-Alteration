from contextlib import asynccontextmanager
from decimal import Decimal
from pathlib import Path
import uuid
import cloudinary
import cloudinary.uploader
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session
from .db import Base, engine, get_db, settings,SessionLocal
from . import models
from .models import Appointment, CustomerProfile, MediaAsset, Order, Product, StoreSettings, User
from .schemas import DashboardOut, ProductInput, ProductOut, StoreSettingsInput
from .security import create_token, require_admin, verify_password
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Alembic owns schema lifecycle; create_all is limited to lightweight local startup.
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)

    # অ্যাডমিন ইউজার অটো-সিড করার কোড
    try:
        db = SessionLocal()
        admin_email = "sharifgazi77@gmail.com"
        existing_user = db.query(User).filter(User.email == admin_email).first()

        if not existing_user:
            hashed_password = pwd_context.hash("1181mmss123456")
            new_admin = User(
                email=admin_email,
                hashed_password=hashed_password,
                is_active=True,
                is_superuser=True
            )
            db.add(new_admin)
            db.commit()
            print("Default admin user created successfully!")
        else:
            print("Admin user already exists.")
        db.close()
    except Exception as e:
        print(f"Error creating default admin: {e}")

    yield


app = FastAPI(title="RZ Custom Tailor API", version="0.1.0", lifespan=lifespan)
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
        return {"store_name": "RZ Custom Tailor & Alteration", "tagline": "Made for the moments that matter.", "hero_title": "Made for the moments that matter.", "hero_description": "Thoughtful tailoring, exceptional fabrics, and a fit that feels entirely your own.", "phone": "", "email": "", "address": "", "business_hours": {}, "social_links": {}, "currency": "USD"}
    return {key: getattr(settings_row, key) for key in StoreSettingsInput.model_fields}


@app.get(f"{router_prefix}/store/settings")
def public_store_settings(db: Session = Depends(get_db)):
    return settings_payload(db.get(StoreSettings, 1))


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


@app.get(f"{router_prefix}/admin/dashboard", response_model=DashboardOut)
def dashboard(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    counts = dict(db.execute(select(Order.status, func.count(Order.id)).group_by(Order.status)).all())
    revenue = db.scalar(select(func.coalesce(func.sum(Order.total), 0)).where(Order.payment_status == "paid")) or Decimal("0.00")
    months = db.execute(select(extract("month", Order.created_at).label("month"), func.sum(Order.total)).where(Order.payment_status == "paid", extract("year", Order.created_at) == func.extract("year", func.current_date())).group_by("month")).all()
    month_totals = {int(month): float(total) for month, total in months}
    recent = db.scalars(select(Order).order_by(Order.created_at.desc()).limit(5)).all()
    recent_orders = [{"id": order.order_number, "customer": order.user_id and db.get(User, order.user_id).email or "Guest customer", "item": "Order details", "date": order.created_at.isoformat(), "total": float(order.total), "status": order.status.replace("_", " ").title()} for order in recent]
    return DashboardOut(total_products=db.scalar(select(func.count(Product.id))) or 0, total_orders=db.scalar(select(func.count(Order.id))) or 0, total_customers=db.scalar(select(func.count(CustomerProfile.id))) or 0, revenue=revenue, status_counts=counts, recent_orders=recent_orders, monthly_revenue=[{"month": i, "sales": month_totals.get(i, 0)} for i in range(1, 13)])
