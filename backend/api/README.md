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
- `GET /images` (public, score >= threshold)
- `GET /admin/photos`
- `PATCH /admin/photos/{id}/score`
- `DELETE /admin/photos/{id}`
- `GET /admin/settings`
- `PATCH /admin/settings`

## Example curl
```bash
curl -F "file=@/path/to/image.jpg" http://localhost:8000/upload
curl http://localhost:8000/images
curl http://localhost:8000/admin/photos
curl -X PATCH http://localhost:8000/admin/photos/<id>/score -H 'Content-Type: application/json' -d '{"score": 0.9}'
curl -X DELETE http://localhost:8000/admin/photos/<id>
curl http://localhost:8000/admin/settings
curl -X PATCH http://localhost:8000/admin/settings -H 'Content-Type: application/json' -d '{"threshold": 0.72}'
```
