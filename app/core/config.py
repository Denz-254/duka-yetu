"""Application configuration management."""

import json
from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, Field, field_validator

class Settings(BaseSettings):
    """Application settings."""

    # Application
    APP_NAME: str = "Duka Yetu POS"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=True)

    # Database
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/duka_yetu"
    )
    DATABASE_POOL_SIZE: int = Field(default=10)
    DATABASE_MAX_OVERFLOW: int = Field(default=20)

    # Security
    JWT_SECRET_KEY: str = Field(
        default="your-secret-key-change-in-production"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440)

    # Security - Password hashing
    BCRYPT_ROUNDS: int = Field(default=12)

    # CORS
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173", "*"]
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if value is None:
            return ["*"]
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return ["*"]
            if stripped.startswith("["):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except json.JSONDecodeError:
                    pass
            return [item.strip() for item in stripped.replace(" ", "").split(",") if item.strip()]
        return value

    ALLOWED_HOSTS: List[str] = Field(default=["*"])

    # Business rules
    LOW_STOCK_THRESHOLD: int = Field(default=10)

    # Frontend URL
    FRONTEND_URL: str = Field(default="http://localhost:5173")

    # Cloudinary Settings
    CLOUDINARY_CLOUD_NAME: str = Field(default="")
    CLOUDINARY_API_KEY: str = Field(default="")
    CLOUDINARY_API_SECRET: str = Field(default="")
    CLOUDINARY_UPLOAD_PRESET: str = Field(default="duka_yetu")

    # Stripe Billing
    STRIPE_SECRET_KEY: str = Field(default="")
    STRIPE_WEBHOOK_SECRET: str = Field(default="")
    STRIPE_BASIC_MONTHLY_PRICE_ID: str = Field(default="")
    STRIPE_BASIC_YEARLY_PRICE_ID: str = Field(default="")
    STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID: str = Field(default="")
    STRIPE_PROFESSIONAL_YEARLY_PRICE_ID: str = Field(default="")
    STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: str = Field(default="")
    STRIPE_ENTERPRISE_YEARLY_PRICE_ID: str = Field(default="")

    # Public API base used for Safaricom callbacks (use ngrok/cloud URL in sandbox)
    API_BASE_URL: str = Field(default="http://localhost:8001")
    MPESA_CALLBACK_BASE_URL: str = Field(default="")

    # Platform-level Daraja credentials (sandbox defaults / fallback)
    MPESA_ENVIRONMENT: str = Field(default="sandbox")  # sandbox | production
    MPESA_CONSUMER_KEY: str = Field(default="")
    MPESA_CONSUMER_SECRET: str = Field(default="")
    MPESA_PASSKEY: str = Field(default="")
    MPESA_SHORTCODE: str = Field(default="174379")

    # Super admin bootstrap credentials
    SUPER_ADMIN_USERNAME: str = Field(default="superadmin")
    SUPER_ADMIN_PASSWORD: str = Field(default="")
    SUPER_ADMIN_EMAIL: str = Field(default="superadmin@dukayetu.local")

    # Marketplace commission percent taken from online orders
    MARKETPLACE_COMMISSION_PERCENT: float = Field(default=5.0)

    # Featured product hero placement (platform fee paid via M-Pesa)
    FEATURE_PRODUCT_FEE_KES: int = Field(default=500)
    FEATURE_PRODUCT_DAYS: int = Field(default=30)

    # Resend transactional email
    RESEND_API_KEY: str = Field(default="")
    RESEND_FROM_EMAIL: str = Field(default="Duka Yetu <onboarding@resend.dev>")
    PLATFORM_NOTIFY_EMAIL: str = Field(default="")

    # Platform subscription prices in KES (paid to platform M-Pesa)
    PLAN_BASIC_MONTHLY_KES: int = Field(default=2500)
    PLAN_BASIC_YEARLY_KES: int = Field(default=25000)
    PLAN_PROFESSIONAL_MONTHLY_KES: int = Field(default=5000)
    PLAN_PROFESSIONAL_YEARLY_KES: int = Field(default=50000)
    PLAN_ENTERPRISE_MONTHLY_KES: int = Field(default=10000)
    PLAN_ENTERPRISE_YEARLY_KES: int = Field(default=100000)

    # Use ConfigDict instead of class Config
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

# Create global settings instance
settings = Settings()
