# BizBot API

FastAPI service for image uploads and listing using Supabase Storage.

## Setup
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install -e ../shared
cp .env.example .env
```

## Run
```bash
uvicorn app.main:app --reload --port 8000
```

## Endpoints
- `POST /upload` (multipart field name: `file`)
- `GET /images`

## Example curl
```bash
curl -F "file=@/path/to/image.jpg" http://localhost:8000/upload
curl http://localhost:8000/images
```
