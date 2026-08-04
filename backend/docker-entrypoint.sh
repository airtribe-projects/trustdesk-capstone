#!/bin/sh
set -e

mkdir -p /app/backend/data

export DATABASE_URL="${DATABASE_URL:-sqlite:///./data/trustdesk.db}"

SEED_MARKER="/app/backend/data/.seeded"

python -m app.database.init_db

if [ ! -f "$SEED_MARKER" ] || [ "${FORCE_SEED}" = "true" ]; then
  echo "Seeding TrustDesk database..."
  python -m app.database.seed
  touch "$SEED_MARKER"
else
  echo "Database already seeded. Set FORCE_SEED=true to re-seed."
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
