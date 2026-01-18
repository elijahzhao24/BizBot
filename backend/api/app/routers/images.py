import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from bizbot_shared.core.config import settings
from bizbot_shared.schemas.photos import (
    PhotoItem,
    PhotoListResponse,
    ScoreUpdateRequest,
    ThresholdResponse,
    ThresholdUpdateRequest,
    UploadResponse,
)
from bizbot_shared.services.gemini_scorer import GeminiScorer
from bizbot_shared.services.photo_pipeline import PhotoPipeline
from bizbot_shared.services.photo_repo import PhotoRepo
from bizbot_shared.services.supabase_storage import StorageService

router = APIRouter()
logger = logging.getLogger("bizbot_api")

MAX_BYTES = 10 * 1024 * 1024
storage_service = StorageService(settings)
photo_repo = PhotoRepo(settings)
gemini_scorer = GeminiScorer(settings)
photo_pipeline = PhotoPipeline(
    storage_service=storage_service,
    photo_repo=photo_repo,
    gemini_scorer=gemini_scorer,
)


@router.post("/upload", response_model=UploadResponse)
async def upload_image(file: UploadFile = File(None)) -> UploadResponse:
    if file is None:
        raise HTTPException(status_code=400, detail="Missing file")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    try:
        result = photo_pipeline.submit_photo(
            content=content,
            content_type=file.content_type,
            original_name=file.filename,
        )
    except RuntimeError as exc:
        logger.exception("Upload failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return UploadResponse(**result)


@router.get("/images", response_model=PhotoListResponse)
async def list_public_images(limit: int = 100, offset: int = 0) -> PhotoListResponse:
    if limit < 1:
        raise HTTPException(status_code=400, detail="Limit must be at least 1")
    if limit > 500:
        raise HTTPException(status_code=400, detail="Limit must be <= 500")
    if offset < 0:
        raise HTTPException(status_code=400, detail="Offset must be >= 0")

    try:
        threshold = photo_repo.get_threshold()
        rows = photo_repo.list_public_photos(
            threshold=threshold, limit=limit, offset=offset
        )
        items = [
            PhotoItem(
                id=row["id"],
                storage_path=row["storage_path"],
                score=row.get("score"),
                url=storage_service.get_url(row["storage_path"]),
            )
            for row in rows
        ]
    except RuntimeError as exc:
        logger.exception("Public list failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return PhotoListResponse(
        items=items,
        limit=limit,
        offset=offset,
        threshold=threshold,
    )


@router.get("/admin/photos", response_model=PhotoListResponse)
async def list_admin_photos(limit: int = 100, offset: int = 0) -> PhotoListResponse:
    if limit < 1:
        raise HTTPException(status_code=400, detail="Limit must be at least 1")
    if limit > 500:
        raise HTTPException(status_code=400, detail="Limit must be <= 500")
    if offset < 0:
        raise HTTPException(status_code=400, detail="Offset must be >= 0")

    try:
        threshold = photo_repo.get_threshold()
        rows = photo_repo.list_photos(limit=limit, offset=offset)
        items = [
            PhotoItem(
                id=row["id"],
                storage_path=row["storage_path"],
                score=row.get("score"),
                url=storage_service.get_url(row["storage_path"]),
            )
            for row in rows
        ]
    except RuntimeError as exc:
        logger.exception("Admin list failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return PhotoListResponse(
        items=items,
        limit=limit,
        offset=offset,
        threshold=threshold,
    )


@router.patch("/admin/photos/{photo_id}/score", response_model=PhotoItem)
async def update_photo_score(
    photo_id: str, payload: ScoreUpdateRequest
) -> PhotoItem:
    try:
        row = photo_repo.update_score(photo_id=photo_id, score=payload.score)
        if row is None:
            raise HTTPException(status_code=404, detail="Photo not found")
        url = storage_service.get_url(row["storage_path"])
    except HTTPException:
        raise
    except RuntimeError as exc:
        logger.exception("Score update failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return PhotoItem(
        id=row["id"],
        storage_path=row["storage_path"],
        score=row.get("score"),
        url=url,
    )


@router.delete("/admin/photos/{photo_id}")
async def delete_photo(photo_id: str) -> dict:
    try:
        row = photo_repo.get_photo(photo_id=photo_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Photo not found")
        photo_repo.delete_photo(photo_id=photo_id)
        try:
            storage_service.delete_object(row["storage_path"])
        except RuntimeError:
            logger.exception("Storage delete failed")
    except HTTPException:
        raise
    except RuntimeError as exc:
        logger.exception("Delete failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"ok": True}


@router.get("/admin/settings", response_model=ThresholdResponse)
async def get_settings() -> ThresholdResponse:
    try:
        threshold = photo_repo.get_threshold()
    except RuntimeError as exc:
        logger.exception("Threshold fetch failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return ThresholdResponse(threshold=threshold)


@router.patch("/admin/settings", response_model=ThresholdResponse)
async def update_settings(
    payload: ThresholdUpdateRequest,
) -> ThresholdResponse:
    try:
        threshold = photo_repo.set_threshold(payload.threshold)
    except RuntimeError as exc:
        logger.exception("Threshold update failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return ThresholdResponse(threshold=threshold)
