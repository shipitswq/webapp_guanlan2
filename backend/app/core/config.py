from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "guanlan"
    app_version: str = "0.1.0"
    debug: bool = True

    database_url: str = "sqlite+aiosqlite:///./guanlan.db"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24h

    class Config:
        env_file = ".env"


settings = Settings()
