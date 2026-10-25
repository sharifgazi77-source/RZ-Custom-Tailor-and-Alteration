"""Create the first administrator using credentials supplied through environment variables."""
import os
from sqlalchemy import select
from .db import SessionLocal
from .models import User
from .security import hash_password

email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "").strip().lower()
password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")
if not email or len(password) < 12:
    raise SystemExit("Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (12+ characters) in backend/.env")
with SessionLocal() as db:
    if db.scalar(select(User.id).where(User.role == "admin")):
        raise SystemExit("An administrator already exists; refusing to add another through bootstrap")
    db.add(User(email=email, password_hash=hash_password(password), role="admin"))
    db.commit()
print(f"Administrator created: {email}")
