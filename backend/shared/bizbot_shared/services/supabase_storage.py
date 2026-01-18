from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from supabase import Client, create_client

from bizbot_shared.core.config import Settings


class StorageService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: Client | None = None

    def _client_instance(self) -> Client:
        if self._client is None:
            try:
                self._client = create_client(
                    self._settings.supabase_url,
                    self._settings.supabase_service_role_key,
                )
            except Exception as exc:  # pragma: no cover - passthrough for API/robot
                raise RuntimeError(str(exc)) from exc
        return self._client

    def _make_filename(self, original_name: str | None, content_type: str | None) -> str:
        ext = None
        if original_name:
            ext = Path(original_name).suffix.lower()
            if ext == "":
                ext = None
        if not ext and content_type and "/" in content_type:
            ext = f".{content_type.split('/')[-1].lower()}"
        if not ext:
            ext = ".jpg"
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        return f"{timestamp}_{uuid4().hex}{ext}"

    def _get_file_url(self, name: str) -> str:
        client = self._client_instance()
        bucket = self._settings.supabase_bucket
        if self._settings.supabase_public_bucket:
            return client.storage.from_(bucket).get_public_url(name)
        signed = client.storage.from_(bucket).create_signed_url(
            name, self._settings.supabase_signed_url_seconds
        )
        if isinstance(signed, dict) and signed.get("error"):
            raise RuntimeError(signed["error"]["message"])
        return signed.get("signedURL")

    def _is_image_name(self, name: str) -> bool:
        if name.startswith("."):
            return False
        return Path(name).suffix.lower() in {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif",
            ".bmp",
            ".heic",
            ".heif",
        }

    def upload_image_bytes(
        self, content: bytes, content_type: str, original_name: str | None
    ) -> tuple[str, str]:
        name = self._make_filename(original_name, content_type)
        client = self._client_instance()

        res = client.storage.from_(self._settings.supabase_bucket).upload(
            name,
            content,
            {"content-type": content_type},
        )
        if isinstance(res, dict) and res.get("error"):
            raise RuntimeError(res["error"]["message"])

        url = self._get_file_url(name)
        return name, url

    def list_images(self, limit: int, offset: int) -> list[dict]:
        client = self._client_instance()
        res = client.storage.from_(self._settings.supabase_bucket).list(
            path="",
            options={
                "limit": limit,
                "offset": offset,
                "sortBy": {"column": "created_at", "order": "desc"},
            },
        )
        if isinstance(res, dict) and res.get("error"):
            raise RuntimeError(res["error"]["message"])

        items: list[dict] = []
        for obj in res:
            name = obj.get("name")
            if not name or not self._is_image_name(name):
                continue
            url = self._get_file_url(name)
            items.append(
                {
                    "name": name,
                    "created_at": obj.get("created_at"),
                    "url": url,
                }
            )
        return items

    def get_oldest_image(self) -> dict | None:
        client = self._client_instance()
        res = client.storage.from_(self._settings.supabase_bucket).list(
            path="",
            options={
                "limit": 100,
                "offset": 0,
                "sortBy": {"column": "created_at", "order": "asc"},
            },
        )
        if isinstance(res, dict) and res.get("error"):
            raise RuntimeError(res["error"]["message"])

        for obj in res:
            name = obj.get("name")
            if not name or not self._is_image_name(name):
                continue
            return {
                "name": name,
                "created_at": obj.get("created_at"),
                "url": self._get_file_url(name),
            }
        return None
