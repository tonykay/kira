from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://kira:kira@localhost:5432/kira"
    api_key: str = "dev-api-key"
    secret_key: str = "dev-secret-key-change-in-production"
    artifact_storage_path: str = "./artifacts"

    model_config = {"env_prefix": "KIRA_"}


settings = Settings()
