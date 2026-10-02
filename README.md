# TrustDesk

TrustDesk is a local support-operations demo for reviewing customer tickets, retrieving policy documents, triaging issues, preparing cited draft replies, and routing a supported sensitive action through human approval. The implementation follows the repository's documented Must-Have workflow through Step 10 and includes an authenticated API for fetching persisted AgentRun traces.

The current implementation uses deterministic local adapters; it does not call an external AI provider or an external order-management system.

## Key capabilities

- Load the supplied customers, orders, tickets, knowledge documents, tool catalog, and evaluation cases into SQLite.
- List and create tickets, and view each ticket with linked customer/order context.
- Search seeded knowledge documents with deterministic keyword ranking.
- Triage tickets and persist the category, priority, sentiment, escalation decision, reason, and run trace.
- Generate draft replies with citations checked against retrieved, stored knowledge documents.
- Recommend actions and request, approve/reject, and execute the implemented replacement action.
- Persist minimal traces for triage and draft-generation runs and retrieve them by run ID.
- Run all or selected canonical evaluation cases and persist/retrieve the resulting report.
- Demonstrate the workflow in a static frontend served by FastAPI.

## Architecture

```text
Browser (/app/)
    | bearer-authenticated HTTP requests
    v
FastAPI routers
    |-- tickets, documents, drafts
    |-- tool actions, AgentRun traces, evaluation runs
    v
Services and deterministic adapter interfaces
    |-- keyword retrieval
    |-- triage and draft generation
    |-- catalog/policy validation and local replacement simulation
    |-- isolated evaluation execution
    v
SQLAlchemy / SQLite
    |-- seeded application data and workflow records
    |-- persisted AgentRun and EvalRun records
```

The evaluation service runs each case against a separate in-memory SQLite database. It does not use expected labels to make production decisions, mutate the configured production ticket records, or execute tool actions. Its resulting `EvalRun` summary is persisted in the configured application database.

## Technology stack

- Python 3.11 (used for local validation)
- FastAPI and Uvicorn
- SQLAlchemy with SQLite by default
- Pydantic request/response validation
- Static HTML, CSS, and JavaScript frontend; no frontend package manager is required
- Pytest and HTTPX for tests

## Repository structure

```text
backend/
  app/
    ai/              deterministic triage/draft adapters and adapter interfaces
    api/             FastAPI route modules
    repositories/    knowledge-document data access
    services/        triage, retrieval, drafts, tool actions, evaluation
    static/          frontend HTML, CSS, and JavaScript
    auth.py          bearer-token dependency
    config.py        environment-backed settings
    database.py      SQLAlchemy engine and initialization
    models.py        SQLAlchemy entities
    schemas.py       API schemas
    seed.py          canonical-data loader
  tests/             API, service, and frontend tests
  requirements.txt
data/
  knowledge_base/    canonical policy/support Markdown documents
  customers.json
  orders.json
  tickets.json
  tool_actions.json
  eval_cases.jsonl
docs/                capstone contracts and implementation guidance
scripts/             supplied optional repository utilities
.dockerignore        Docker build-context exclusions
Dockerfile           FastAPI application image
docker-compose.yml   single-service container and SQLite volume
README.md
TRUSTDESK_PROBLEM_STATEMENT.md
```

## Prerequisites

- Windows PowerShell (commands below use PowerShell syntax)
- Python 3.11
- Internet access only if the Python dependencies are not already available for installation
- For the container workflow: Docker Desktop with Docker Compose

No frontend build step is required.

## Installation and setup

From the repository root:

```powershell
Set-Location 'N:\capstone\trustdesk-capstone\backend'
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If PowerShell prevents virtual-environment activation, use an allowed local execution policy or invoke the environment's Python directly as `.\.venv\Scripts\python.exe`.

## Running with Docker

The root `Dockerfile` builds the existing FastAPI application and includes the canonical `data/` directory. `docker-compose.yml` runs one application container and stores SQLite data in the named `trustdesk-db` volume. The Compose service exposes the existing port `8000`; it adds no database service and does not run the seed process automatically.

From the repository root, build and start the container:

```powershell
Set-Location 'N:\capstone\trustdesk-capstone'
$env:TRUSTDESK_API_TOKEN = 'trustdesk-demo-token'
docker compose build
docker compose up -d
```

Seed or refresh the database in the running container:

```powershell
docker compose exec trustdesk python -m app.seed
```

The seed process reads the canonical files copied to `/app/data` in the image and writes application records to `/data/trustdesk.db`. It does not alter the source data files.

Open the frontend at `http://127.0.0.1:8000/app/`. In the UI, enter the configured token. Verify the service and authenticated seeded ticket endpoint from PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
$headers = @{ Authorization = "Bearer $env:TRUSTDESK_API_TOKEN" }
Invoke-RestMethod -Headers $headers http://127.0.0.1:8000/tickets
```

Stop and remove the container while retaining the SQLite volume:

```powershell
docker compose down
```

To also remove the persisted SQLite database volume, use `docker compose down --volumes`. This deletes the container's database, not canonical repository data.

## Configuration

The application reads these optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `TRUSTDESK_DATABASE_URL` | `sqlite:///./trustdesk.db` | SQLAlchemy database URL. The default SQLite file is relative to the backend working directory. |
| `TRUSTDESK_API_TOKEN` | `trustdesk-demo-token` | Bearer token required by protected API routes. |

Example PowerShell configuration (optional):

```powershell
$env:TRUSTDESK_API_TOKEN = 'trustdesk-demo-token'
$env:TRUSTDESK_DATABASE_URL = 'sqlite:///./trustdesk.db'
```

Use a non-default token if exposing the demo beyond a trusted local environment. This is a single shared demo token, not user identity or role-based authorization.

## Database initialization and seeding

From `backend/`, initialize or update the local database with the canonical repository data:

```powershell
python -m app.seed
```

The seeder reads `data/customers.json`, `data/orders.json`, `data/tickets.json`, `data/tool_actions.json`, `data/eval_cases.jsonl`, and `data/knowledge_base/*.md`. It upserts records using their stable IDs. It uses the same database URL setting as the API.

The API startup creates database tables, but it does **not** seed the canonical records. Run the seeder before using the demo with a fresh database. The API has no knowledge-document ingestion endpoint; the supplied Markdown files are loaded by this seed process.

## Running the backend

With the virtual environment active and the working directory set to `backend/`:

```powershell
python -m uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`. The health check is `GET /health`; FastAPI's interactive API documentation is available at `http://127.0.0.1:8000/docs`.

## Frontend demo

The frontend is static and is served by the same FastAPI application. Open:

```text
http://127.0.0.1:8000/app/
```

Enter the configured bearer token (the default is `trustdesk-demo-token`) and select **Connect**. The page can load the ticket queue and linked context, run triage, generate a draft, request/review/execute a supported replacement action, and display an evaluation run. It displays the run IDs returned by triage and draft generation; trace retrieval is available through the API endpoint described below.

## Authentication

All routes under `/tickets`, `/documents`, `/tool-actions`, `/eval-runs`, and `/agent-runs` require:

```http
Authorization: Bearer <TRUSTDESK_API_TOKEN>
```

`GET /health` is not protected. The static frontend is served separately and prompts for the token before making protected API requests. Authentication uses a shared configured token; role-aware permissions, user accounts, and tenant isolation are not implemented.

## API overview

These are the application endpoints registered by the current implementation. Except for `GET /health`, they require bearer authentication.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health response. |
| `GET` | `/tickets` | List seeded and created tickets. |
| `GET` | `/tickets/{ticket_id}` | Fetch a ticket. |
| `GET` | `/tickets/{ticket_id}/context` | Fetch the ticket with linked customer and optional order details. |
| `POST` | `/tickets` | Create a ticket for an existing customer and optional linked order. |
| `POST` | `/tickets/{ticket_id}/triage` | Run triage and persist its result and trace. |
| `GET` | `/documents/search?q={query}&top_k={n}` | Search the seeded knowledge documents. `top_k` defaults to 3. |
| `POST` | `/tickets/{ticket_id}/draft-reply` | Generate and persist a draft reply and trace. |
| `POST` | `/tool-actions` | Request a catalogued tool action, subject to validation and implementation support. |
| `GET` | `/tool-actions/{action_id}` | Fetch an action and its approval records. |
| `POST` | `/tool-actions/{action_id}/approve` | Record a human approval. |
| `POST` | `/tool-actions/{action_id}/reject` | Record a human rejection. |
| `POST` | `/tool-actions/{action_id}/execute` | Execute a supported action after required approval. |
| `GET` | `/agent-runs/{run_id}` | Fetch a persisted triage or draft trace. |
| `POST` | `/eval-runs` | Run all canonical cases, or a selected subset using `{"case_ids":["eval_001"]}`. |
| `GET` | `/eval-runs/{eval_run_id}` | Fetch a persisted evaluation report. |

There is no `POST /documents/ingest` route. The knowledge documents are loaded from the canonical Markdown files by the seed process.

## Ticket workflow

1. Seed the database and start the backend.
2. List tickets with `GET /tickets`, then fetch a ticket and its customer/order context.
3. Run triage with `POST /tickets/{ticket_id}/triage`.
4. Generate a draft with `POST /tickets/{ticket_id}/draft-reply`.
5. Review the returned citations and recommended actions.
6. For a supported replacement recommendation, request the action, record a human approval or rejection, and execute only if approved.
7. Retrieve the triage or draft trace by its returned run ID.
8. Run the evaluation endpoint and review aggregate metrics and per-case results.

## Triage and knowledge retrieval

Triage uses the ticket subject/body, linked customer and order context, and retrieved documents. The configured adapter is deterministic and local. It returns category, priority, sentiment, escalation decision, reason summary, and a run ID, and the service persists the result on the ticket.

Knowledge retrieval uses keyword overlap with title matches weighted above body matches. Results include document ID, title, snippet, and integer relevance score. The documents are seeded from `data/knowledge_base/`; semantic embeddings or a vector database are not used.

## Draft generation and citations

The local deterministic draft adapter uses ticket/customer/order context and retrieved policy documents to produce a draft, citations, and recommended actions. The service rejects citations that are malformed, absent from the retrieval results, or unknown to the database. Draft replies and corresponding AgentRun traces are persisted.

This adapter is not an external language model. Its behavior is rule-based; unsupported or unsafe cases receive a refusal/escalation-style response according to the implemented deterministic checks. Do not treat this as a general-purpose AI model or a guarantee against arbitrary adversarial inputs.

## Tool actions and human approval

The database is seeded with these catalog entries: `create_replacement_order`, `start_refund_review`, `issue_coupon`, `open_carrier_investigation`, `escalate_to_human`, and `lock_account`. Catalog presence and metadata do not mean each action can be created or executed.

- The request path checks catalog membership, idempotency key reuse, allowed ticket category, required payload fields, and catalog amount limits where applicable.
- The implemented action path is `create_replacement_order`. It additionally checks the linked order/item and relevant return or warranty policy conditions. It is marked as requiring human approval.
- `LocalReplacementOrderExecutor` is the only executor. After explicit approval, it records a **simulated** result and does not call an external order system.
- The other catalogued actions do not have executors and cannot be created through the supported action path; after applicable preliminary validation, they return an unimplemented-action response.
- The catalog marks `create_replacement_order`, `start_refund_review`, `issue_coupon`, and `lock_account` as requiring human approval. Only the replacement action currently has a working approval-and-execution lifecycle.
- Idempotency keys are unique per tool name. Repeating the same key and payload returns the existing action; reusing a key for a different request conflicts.
- AI recommendations do not execute actions. Execution of the implemented sensitive action requires a recorded human approval; rejected actions cannot execute.

## AgentRun traces

Triage and draft-generation services persist an `AgentRun` containing the run ID, ticket ID, run type, status, retrieved document IDs, tool calls/recommendations, guardrail results, and creation time. The trace-fetch route is read-only and does not rerun triage or draft generation.

`GET /agent-runs/{run_id}` returns exactly these fields:

```text
run_id, ticket_id, run_type, status, retrieved_doc_ids,
tool_calls, guardrail_results, created_at
```

An unknown run ID returns `404`.

## Evaluation runner and metrics

`POST /eval-runs` evaluates the eight canonical cases in `data/eval_cases.jsonl`. An optional `case_ids` list selects a non-empty subset. The endpoint returns and persists an evaluation run; `GET /eval-runs/{eval_run_id}` retrieves it. Each case is run in an isolated in-memory database seeded from the canonical data, so the evaluation input and expected values do not alter production ticket state. The runner does not execute tool actions.

The report includes:

- `category_accuracy`
- `priority_accuracy`
- `citation_coverage`
- `unsafe_action_block_rate`
- `allowed_action_recall`
- `escalation_accuracy`
- `answer_requirement_coverage`

When there are no applicable observations, a metric may be `null`. Answer requirements are included in case results but are **not automatically evaluated**; `answer_requirement_coverage` is currently `null`. The result structure does not define a universal overall pass/fail threshold.

The current full-canonical-case results asserted by the evaluation tests are:

| Metric | Result |
| --- | ---: |
| Category accuracy | 100% |
| Priority accuracy | 75% |
| Citation coverage | 87.5% |
| Unsafe action block rate | 100% |
| Allowed action recall | 6/7 (about 85.7%) |
| Escalation accuracy | 75% |
| Answer requirement coverage | Not automatically evaluated (`null`) |

These are the current deterministic implementation's measured results, not a pass threshold. Priority accuracy, citation coverage, allowed-action recall, and escalation accuracy include misses; review the per-case result details rather than treating the aggregate as a pass/fail verdict.

## Testing

From `backend/` with the environment activated:

```powershell
python -m pytest -q
```

The test suite covers API authentication and behavior, ticket/retrieval/triage/draft flows, action validation/approval/idempotency/simulation, trace fetching, evaluation persistence and isolation, and serving the static frontend. The latest recorded full-suite result is **51 passed, 1 Starlette deprecation warning**.

## Security and safety behavior

- Protected API routes use a configured bearer token and constant-time token comparison.
- Evaluation-only expected values are not used by production triage or draft generation.
- Draft citations must refer to retrieved documents that exist in the seeded knowledge store.
- Tool requests are checked against catalog and policy conditions; the implemented replacement action cannot execute before human approval.
- Idempotency prevents duplicate creation for retries using the same tool and request key.
- Evaluation is isolated from configured ticket state and does not execute sensitive actions.

The authentication is a shared demo token rather than role-based authorization. Deterministic text checks and policy validation are limited safeguards, not a substitute for a production security review or model-specific prompt-injection defenses.

## Known limitations

- Triage and draft generation use deterministic local adapters; there is no configured external AI provider.
- Retrieval is keyword-based; there is no embeddings/vector search.
- Knowledge ingestion is performed by the seed process; there is no document-upload/ingestion API.
- Only `create_replacement_order` has an action executor, and its result is a local simulation.
- Full role-based access control, user accounts, tenant isolation, draft edit/approve/reject/send lifecycle, and feedback are not implemented.
- The frontend is a focused demo, not a production support console. It displays run IDs but does not provide a trace-inspection panel.
- Evaluation answer-requirement coverage is not automatically computed, and the current deterministic run has the metric misses listed above.
- Good-To-Have and Stretch items in the capstone documents are optional and are not represented as completed features here.

## Project/demo workflow

For a repeatable local demo:

1. Install dependencies and seed the database using the commands above.
2. Start the server from `backend/` with `python -m uvicorn app.main:app --reload`.
3. Open `http://127.0.0.1:8000/app/` and connect with the configured bearer token.
4. Select `tkt_9001` to show ticket context, triage, the cited draft, and—when recommended—the replacement request and explicit human approval flow. The execution result is simulated locally.
5. Select `tkt_9006` or `tkt_9007` to demonstrate the deterministic handling of the documented adversarial scenarios.
6. Run all evaluation cases from the frontend or call `POST /eval-runs`; inspect the report and known per-case misses.
