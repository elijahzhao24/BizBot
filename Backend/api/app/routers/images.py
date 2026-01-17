import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from bizbot_shared.core.config import settings
from bizbot_shared.schemas.images import ImageItem, ImageListResponse, UploadResponse
from bizbot_shared.services.supabase_storage import StorageService

router = APIRouter()
logger = logging.getLogger("bizbot_api")

MAX_BYTES = 10 * 1024 * 1024
storage_service = StorageService(settings)


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
        name, url = storage_service.upload_image_bytes(
            content=content,
            content_type=file.content_type,
            original_name=file.filename,
        )
    except RuntimeError as exc:
        logger.exception("Upload failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return UploadResponse(name=name, url=url)


@router.get("/images", response_model=ImageListResponse)
async def list_images(limit: int = 100, offset: int = 0) -> ImageListResponse:
    if limit < 1:
        raise HTTPException(status_code=400, detail="Limit must be at least 1")
    if limit > 500:
        raise HTTPException(status_code=400, detail="Limit must be <= 500")
    if offset < 0:
        raise HTTPException(status_code=400, detail="Offset must be >= 0")

    try:
        items = storage_service.list_images(limit=limit, offset=offset)
    except RuntimeError as exc:
        logger.exception("List failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return ImageListResponse(
        items=[ImageItem(**item) for item in items],
        limit=limit,
        offset=offset,
    )
