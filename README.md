# BizBot
Instant event photos.

## Repo Layout
- `backend/shared`: shared Python package (`bizbot_shared`) for Supabase storage access
- `backend/api`: FastAPI service for image upload + AI scoring
- `backend/robot`: placeholder for future robot main loop (empty for now)
- `frontend`: frontend app

## Database
Run the migration to create `photos` and `settings`:
```sql
backend/shared/migrations/001_photos_and_settings.sql
```

## Setup (API)
```bash
cd backend/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install -e ../shared
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Required env in `backend/api/.env`:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET` (default `images`)
- `SUPABASE_PUBLIC_BUCKET` (`true`/`false`)
- `SUPABASE_SIGNED_URL_SECONDS`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (default `gemini-2.5-flash`)
- `DEFAULT_THRESHOLD` (default `0.75`)

API endpoints:
- `POST /upload`
- `GET /images` (public, score >= threshold)
- `GET /admin/photos`
- `PATCH /admin/photos/{id}/score`
- `DELETE /admin/photos/{id}`
- `GET /admin/settings`
- `PATCH /admin/settings`

## Setup (Frontend)
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Notes
- The shared package keeps Supabase logic in one place for API and future robot use.
- For the robot process, direct import (no HTTP) is simplest locally; use HTTP only if you want to decouple or run it separately.
