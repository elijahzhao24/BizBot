from pydantic import BaseModel


class UploadResponse(BaseModel):
    name: str
    url: str


class ImageItem(BaseModel):
    name: str
    created_at: str | None = None
    url: str


class ImageListResponse(BaseModel):
    items: list[ImageItem]
    limit: int
    offset: int
