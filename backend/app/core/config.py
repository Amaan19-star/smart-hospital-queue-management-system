import os

class Settings:
    PROJECT_NAME: str = "Smart Hospital Queue Management System"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-hospital-jwt-key-2026-secure-random-token")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Defaults to SQLite if PostgreSQL is not specified or reachable
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./hospital.db"
    )

settings = Settings()
