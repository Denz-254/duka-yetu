"""Application configuration management."""

from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, Field

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

    # Use ConfigDict instead of class Config
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

# Create global settings instance
settings = Settings()
