"""
App settings loaded from environment variables.
I5.3: secrets only from env, never hardcoded.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    # Database toggle — sqlite for local, supabase for prod
    DB_MODE: str = "sqlite"
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_DB_URL: str = ""   # postgresql+asyncpg://...?options=-c search_path=crm
    SQLITE_PATH: str = "./local_test.db"

    # Retell AI
    RETELL_API_KEY: str = ""
    RETELL_FROM_NUMBER: str = ""
    RETELL_WEBHOOK_SECRET: str = ""

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_SUCCESS_URL: str = "http://localhost:3000/payments?session_id={CHECKOUT_SESSION_ID}&status=success"
    STRIPE_CANCEL_URL: str = "http://localhost:3000/payments?status=cancelled"

    # Google Calendar OAuth 2.0
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/calendar/callback"

    # Rate limiting
    RATE_LIMIT_AUTH: str = "5/minute"
    RATE_LIMIT_DEFAULT: str = "60/minute"

    class Config:
        env_file = ".env"


settings = Settings()
