import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.images import router as images_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="BizBot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(images_router)
