"""Duka Yetu POS System - Main Application."""

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
from datetime import datetime

from app.core.config import settings
from app.core.database import init_db, engine, SessionLocal
from app.api import auth, products, sales, dashboard, upload, subscription, resources, payments, admin, marketplace, orders
from app.core.bootstrap import ensure_schema_patches, ensure_super_admin
from app.core.dependencies import require_feature
from app.domains.users.routes import router as users_router
from app.models.mpesa_transaction import MpesaTransaction  # noqa: F401 — register model
from app.models.online_order import Notification, OnlineOrder  # noqa: F401 — register model

# Use lifespan instead of on_event (modern FastAPI)
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    print(f"📊 Environment: {settings.ENVIRONMENT}")
    print(f"🔗 Database: {settings.DATABASE_URL}")
    
    # Initialize database
    init_db()
    print("✅ Database initialized")

    db = SessionLocal()
    try:
        ensure_schema_patches(db)
        ensure_super_admin(db)
    finally:
        db.close()
    
    # Check Cloudinary configuration
    if settings.CLOUDINARY_CLOUD_NAME:
        print(f"☁️ Cloudinary configured: {settings.CLOUDINARY_CLOUD_NAME}")
    else:
        print("⚠️ Cloudinary not configured - uploads disabled")

    if settings.MPESA_ENVIRONMENT == "sandbox":
        print("📱 M-Pesa mode: sandbox")
    else:
        print("📱 M-Pesa mode: production")
    
    yield  # Application runs here
    
    # Shutdown
    print(f"🛑 {settings.APP_NAME} shutting down...")
    engine.dispose()
    print("✅ Database connections closed")

# Create FastAPI app with lifespan
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Multi-tenant POS and Business Management System",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,  # Use the lifespan context manager
)

# ✅ CORS middleware - MUST be FIRST
# Codespaces origins change per machine; regex covers *.app.github.dev / *.github.dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if hasattr(settings, 'CORS_ORIGINS') else ["*"],
    allow_origin_regex=r"https://.*\.(app\.)?github\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Trusted host middleware (security)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if settings.DEBUG else settings.ALLOWED_HOSTS if hasattr(settings, 'ALLOWED_HOSTS') else ["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(
    products.router,
    prefix="/api/v1/products",
    tags=["Products"],
    dependencies=[Depends(require_feature("products"))],
)
app.include_router(
    sales.router,
    prefix="/api/v1/sales",
    tags=["Sales"],
    dependencies=[Depends(require_feature("pos"))],
)
app.include_router(
    dashboard.router,
    prefix="/api/v1/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(require_feature("basic_reports"))],
)
app.include_router(
    users_router,
    prefix="/api/v1",
    tags=["Users"],
    dependencies=[Depends(require_feature("business_settings"))],
)
app.include_router(
    upload.router,
    prefix="/api/v1/upload",
    tags=["Upload"],
    dependencies=[Depends(require_feature("products"))],
)
app.include_router(
    subscription.router,
    prefix="/api/v1/subscription",
    tags=["Subscription"],
)
app.include_router(resources.router, prefix="/api/v1", tags=["Business Resources"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Super Admin"])
app.include_router(marketplace.router, prefix="/api/v1/marketplace", tags=["Marketplace"])
app.include_router(
    orders.router,
    prefix="/api/v1/orders",
    tags=["Online Orders"],
    dependencies=[Depends(require_feature("pos"))],
)

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs" if settings.DEBUG else None,
        "health": "/health",
        "timestamp": datetime.now().isoformat(),
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "timestamp": datetime.now().isoformat(),
        "environment": settings.ENVIRONMENT,
        "database": "connected",
        "upload_enabled": bool(settings.CLOUDINARY_CLOUD_NAME) if hasattr(settings, 'CLOUDINARY_CLOUD_NAME') else False,
    }
