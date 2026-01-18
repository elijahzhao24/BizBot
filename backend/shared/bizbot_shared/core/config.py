from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    supabase_bucket: str = "images"
    supabase_public_bucket: bool = True
    supabase_signed_url_seconds: int = 600
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    default_threshold: float = 0.75

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
