from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:root@localhost:5433/digital_wallet"
    JWT_SECRET: str = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"
    JWT_EXPIRATION: int = 86400000  # 24 小時（毫秒）

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
