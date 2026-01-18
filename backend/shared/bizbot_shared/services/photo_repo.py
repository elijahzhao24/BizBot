from supabase import Client, create_client

from bizbot_shared.core.config import Settings


class PhotoRepo:
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

    @staticmethod
    def _ensure_ok(response) -> list[dict]:
        error = getattr(response, "error", None)
        if error:
            message = getattr(error, "message", None) or str(error)
            raise RuntimeError(message)
        data = getattr(response, "data", None)
        return data or []

    def insert_photo(self, storage_path: str, score: float | None) -> dict:
        payload = {"storage_path": storage_path, "score": score}
        res = self._client_instance().table("photos").insert(payload).execute()
        data = self._ensure_ok(res)
        if not data:
            raise RuntimeError("Failed to insert photo")
        return data[0]

    def get_photo(self, photo_id: str) -> dict | None:
        res = (
            self._client_instance()
            .table("photos")
            .select("id, storage_path, score")
            .eq("id", photo_id)
            .limit(1)
            .execute()
        )
        data = self._ensure_ok(res)
        return data[0] if data else None

    def list_photos(self, limit: int, offset: int) -> list[dict]:
        end = offset + limit - 1
        res = (
            self._client_instance()
            .table("photos")
            .select("id, storage_path, score")
            .order("id", desc=True)
            .range(offset, end)
            .execute()
        )
        return self._ensure_ok(res)

    def list_public_photos(self, threshold: float, limit: int, offset: int) -> list[dict]:
        end = offset + limit - 1
        res = (
            self._client_instance()
            .table("photos")
            .select("id, storage_path, score")
            .gte("score", threshold)
            .order("id", desc=True)
            .range(offset, end)
            .execute()
        )
        return self._ensure_ok(res)

    def update_score(self, photo_id: str, score: float) -> dict | None:
        res = (
            self._client_instance()
            .table("photos")
            .update({"score": score})
            .eq("id", photo_id)
            .execute()
        )
        data = self._ensure_ok(res)
        return data[0] if data else None

    def delete_photo(self, photo_id: str) -> None:
        res = (
            self._client_instance()
            .table("photos")
            .delete()
            .eq("id", photo_id)
            .execute()
        )
        self._ensure_ok(res)

    def get_threshold(self) -> float:
        res = (
            self._client_instance()
            .table("settings")
            .select("threshold")
            .eq("key", "photo_threshold")
            .limit(1)
            .execute()
        )
        data = self._ensure_ok(res)
        if not data:
            return float(self._settings.default_threshold)
        return float(data[0]["threshold"])

    def set_threshold(self, threshold: float) -> float:
        payload = {"key": "photo_threshold", "threshold": threshold}
        res = (
            self._client_instance()
            .table("settings")
            .upsert(payload, on_conflict="key")
            .execute()
        )
        data = self._ensure_ok(res)
        if not data:
            return float(threshold)
        return float(data[0]["threshold"])
