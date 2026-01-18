# BizBot Shared Package

Reusable Python code shared by the API and robot processes.

## Install (editable)
```bash
pip install -e .
```

## Environment
The shared settings read from `.env` in the current working directory:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET` (default `images`)
- `SUPABASE_PUBLIC_BUCKET` (`true` or `false`)
- `SUPABASE_SIGNED_URL_SECONDS` (seconds, default 600)
