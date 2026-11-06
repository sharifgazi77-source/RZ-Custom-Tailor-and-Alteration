from io import BytesIO
from pathlib import Path
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.db import SessionLocal
from app.models import MediaAsset, Product, User
from app.security import hash_password


def test_health_is_public():
    with TestClient(app) as client:
        assert client.get("/api/v1/health").json() == {"status": "ok"}


def test_admin_data_requires_authentication():
    with TestClient(app) as client:
        assert client.get("/api/v1/admin/dashboard").status_code == 401
        assert client.get("/api/v1/admin/products").status_code == 401


def test_product_create_is_not_public():
    payload = {"title": "Test jacket", "slug": "test-jacket", "price": "100.00", "stock": 1}
    with TestClient(app) as client:
        assert client.post("/api/v1/admin/products", json=payload).status_code == 401


def test_media_upload_is_not_public():
    with TestClient(app) as client:
        assert client.post("/api/v1/admin/media", files={"file": ("x.png", b"not-an-image", "image/png")}).status_code == 401


def test_store_settings_are_publicly_readable_but_not_publicly_editable():
    payload = {"store_name": "Test Atelier", "tagline": "Made personal", "hero_title": "Made for you", "hero_description": "Test copy", "phone": "", "email": "", "address": "", "business_hours": {}, "social_links": {}, "currency": "USD"}
    with TestClient(app) as client:
        assert client.get("/api/v1/store/settings").status_code == 200
        assert client.put("/api/v1/admin/store/settings", json=payload).status_code == 401


def test_admin_login_and_product_create_round_trip():
    email = "api-test-admin@example.invalid"
    slug = "api-test-product"
    with SessionLocal() as db:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            db.delete(existing)
            db.commit()
        db.add(User(email=email, password_hash=hash_password("test-password-with-12-chars"), role="admin"))
        db.commit()
    try:
        with TestClient(app) as client:
            token_response = client.post("/api/v1/auth/login", data={"username": email, "password": "test-password-with-12-chars"})
            assert token_response.status_code == 200
            headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
            payload = {"title": "API Test Jacket", "slug": slug, "category": "Jackets", "price": "120.00", "stock": 3, "status": "published"}
            created = client.post("/api/v1/admin/products", json=payload, headers=headers)
            assert created.status_code == 201
            assert created.json()["slug"] == slug
            changed = {**payload, "title": "API Test Jacket Updated", "price": "125.00"}
            updated = client.patch(f"/api/v1/admin/products/{created.json()['id']}", json=changed, headers=headers)
            assert updated.status_code == 200
            assert updated.json()["title"] == "API Test Jacket Updated"
            assert client.get("/api/v1/admin/products", headers=headers).status_code == 200
            assert client.get("/api/v1/admin/dashboard", headers=headers).status_code == 200
            image_buffer = BytesIO()
            Image.new("RGB", (2, 2), color="navy").save(image_buffer, format="PNG")
            image = image_buffer.getvalue()
            upload = client.post("/api/v1/admin/media", headers=headers, files={"file": ("pixel.png", image, "image/png")})
            assert upload.status_code == 201
            assert upload.json()["content_type"] == "image/png"
            assert upload.json()["size_bytes"] == len(image)
    finally:
        with SessionLocal() as db:
            db.query(Product).filter(Product.slug == slug).delete()
            media = db.query(MediaAsset).filter(MediaAsset.filename == "pixel.png").all()
            for asset in media:
                if asset.storage_key and not asset.storage_key.startswith("rz-custom-tailor/"):
                    Path("uploads", asset.storage_key).unlink(missing_ok=True)
                db.delete(asset)
            db.query(User).filter(User.email == email).delete()
            db.commit()
