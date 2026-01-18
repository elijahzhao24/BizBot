from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    id: str
    storage_path: str
    score: float | None = None
    url: str | None = None


class PhotoItem(BaseModel):
    id: str
    storage_path: str
    score: float | None = None
    url: str | None = None


class PhotoListResponse(BaseModel):
    items: list[PhotoItem]
    limit: int
    offset: int
    threshold: float


class ThresholdResponse(BaseModel):
    threshold: float


class ThresholdUpdateRequest(BaseModel):
    threshold: float = Field(..., ge=0.0, le=1.0)


class ScoreUpdateRequest(BaseModel):
    score: float = Field(..., ge=0.0, le=1.0)
