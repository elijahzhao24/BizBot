# BizBot
Instant event photos.

## Repo Layout
- `Backend/shared`: shared Python package (`bizbot_shared`) for Supabase storage access
- `Backend/api`: FastAPI service for image upload/list
- `Backend/robot`: placeholder for future robot main loop (empty for now)
- `frontend`: Next.js frontend app

## Setup (API)
```bash
cd Backend/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install -e ../shared
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

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
