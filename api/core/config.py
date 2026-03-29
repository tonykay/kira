from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://kira:kira@localhost:5432/kira"
    api_key: str = "dev-api-key"
    secret_key: str = "dev-secret-key-change-in-production"
    artifact_storage_path: str = "./artifacts"
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str = "gpt-4o"
    allow_iframe: bool = False
    cors_origins: str = ""

    model_config = {"env_prefix": "KIRA_"}


settings = Settings()
