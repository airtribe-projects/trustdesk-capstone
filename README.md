# TrustDesk AI Support Platform

## Overview
A lightweight AI‑first support system built with Node/Express backend, FAISS retrieval, and a Vite‑React frontend. It demonstrates ticket triage, grounded draft generation with citations, and safe action approval.

## Quick Start (Docker)
```bash
# copy example env file
cp .env.example .env
# start services
docker-compose up --build
```
The backend will be reachable at `http://localhost:3000` and the UI at `http://localhost:5173`.

## Development (without Docker)
```bash
# Backend
cd backend && npm install && npm start
# Frontend
cd ../frontend && npm install && npm run dev
```

## Evaluation
Place evaluation cases in `eval_cases.jsonl` (one JSON per line) and run:
```bash
node run_evals.js
```

## Architecture
- **Backend**: Express API, SQLite (`better-sqlite3`), FAISS (`faiss-node`).
- **Frontend**: Vite + React, Proxy to backend.
- **Trace Logging**: Every request writes a trace record to SQLite for observability.

## Environment Variables
| Variable | Description |
|---|---|
| DEMO_TOKEN | Simple token for demo auth |
| PORT | Backend port (default 3000) |

## License
MIT
