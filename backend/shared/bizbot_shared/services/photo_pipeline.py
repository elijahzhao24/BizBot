import logging

from bizbot_shared.schemas.photos import UploadResponse
from bizbot_shared.services.gemini_scorer import GeminiScorer
from bizbot_shared.services.photo_repo import PhotoRepo
from bizbot_shared.services.supabase_storage import StorageService

logger = logging.getLogger("bizbot_photo_pipeline")


class PhotoPipeline:
    def __init__(
        self,
        storage_service: StorageService,
        photo_repo: PhotoRepo,
        gemini_scorer: GeminiScorer,
    ) -> None:
        self._storage_service = storage_service
        self._photo_repo = photo_repo
        self._gemini_scorer = gemini_scorer

    def submit_photo(
        self, content: bytes, content_type: str, original_name: str | None
    ) -> dict:
        storage_path = self._storage_service.upload_image_bytes(
            content=content,
            content_type=content_type,
            original_name=original_name,
        )

        score: float | None = None
        try:
            score = self._gemini_scorer.score_image(
                image_bytes=content,
                content_type=content_type,
            )
        except Exception as exc:
            logger.warning("Gemini scoring failed: %s", exc)

        row = self._photo_repo.insert_photo(storage_path=storage_path, score=score)
        threshold = self._photo_repo.get_threshold()
        url = None
        if score is not None and score >= threshold:
            url = self._storage_service.get_url(storage_path)

        return UploadResponse(
            id=row["id"],
            storage_path=row["storage_path"],
            score=row.get("score"),
            url=url,
        ).model_dump()
