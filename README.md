# TrustDesk - AI Customer Support Operations Platform

An AI-first customer support operations platform that triages tickets, retrieves policy context, generates cited draft replies, enforces security guardrails, and supports approval-gated tool actions with full audit trails.

## Architecture

```
trustdesk-capstone/
├── backend/                    # Java 21 + Spring Boot 3 + SQLite
│   └── src/main/java/com/trustdesk/
│       ├── controller/         # REST API endpoints
│       ├── service/            # Triage, draft reply, data loading
│       ├── action/             # Tool action management & approval workflow
│       ├── retrieval/          # Knowledge base keyword search
│       ├── guardrails/         # Prompt injection, identity bypass detection
│       ├── evaluation/         # Eval runner over eval_cases.jsonl
│       ├── model/              # JPA entities (Customer, Order, Ticket, etc.)
│       ├── dto/                # API request/response DTOs
│       ├── repository/         # Spring Data JPA repositories
│       ├── config/             # CORS, web config
│       ├── security/           # Demo token auth filter
│       └── exception/          # Centralized error handling
├── frontend/                   # React + TypeScript + Vite
│   └── src/
│       ├── pages/              # TicketList, TicketDetail, EvalDashboard
│       ├── services/           # API client
│       └── types/              # TypeScript interfaces
├── data/                       # Supplied seed data (NOT modified)
│   ├── customers.json
│   ├── orders.json
│   ├── tickets.json
│   ├── tool_actions.json
│   ├── eval_cases.jsonl
│   └── knowledge_base/         # Policy documents (KB-REFUND-001, etc.)
├── docs/                       # Supplied documentation
└── .github/workflows/ci.yml   # GitHub Actions CI
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 21, Spring Boot 3.3.5, Maven |
| Database | SQLite via Spring Data JPA + Hibernate Community Dialects |
| Frontend | React 18, TypeScript, Vite 5 |
| Testing | JUnit 5, Spring Boot Test, MockMvc |
| CI/CD | GitHub Actions |

## Prerequisites

- **Java 21+** (JDK)
- **Maven 3.9+**
- **Node.js 20+** and npm

## Quick Start

### Backend

```bash
cd backend
mvn clean compile
mvn spring-boot:run
```

The backend starts on `http://localhost:8080`. Data is automatically loaded from `data/` on first startup.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:5173` and connects to the backend at port 8080.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `trustdesk.data.path` | `../data` | Path to seed data directory |
| `trustdesk.auth.token` | `trustdesk-demo-token-2026` | Demo authentication token |
| `server.port` | `8080` | Backend server port |

## Data Loading

On startup, the backend automatically loads:
- `data/customers.json` - 6 customers
- `data/orders.json` - 6 orders
- `data/tickets.json` - 8 support tickets
- `data/knowledge_base/*.md` - 8 policy documents
- `data/tool_actions.json` - 6 tool definitions
- `data/eval_cases.jsonl` - 8 evaluation cases

Data is loaded into SQLite (`trustdesk.db`). Duplicate loading is prevented by checking record counts.

## API Overview

All API endpoints require the `X-Auth-Token` header (default: `trustdesk-demo-token-2026`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tickets` | List all tickets with customer/order context |
| GET | `/api/tickets/{id}` | Get ticket details |
| POST | `/api/tickets/{id}/triage` | Run AI triage |
| POST | `/api/tickets/{id}/draft-reply` | Generate cited draft reply |
| GET | `/api/tickets/{id}/traces` | Get audit traces for ticket |
| POST | `/api/tickets/{id}/actions` | Request a tool action |
| GET | `/api/actions/{id}` | Get action status |
| POST | `/api/actions/{id}/approve` | Approve pending action |
| POST | `/api/actions/{id}/reject` | Reject pending action |
| GET | `/api/knowledge/search?q=` | Search knowledge base |
| POST | `/api/evaluations/run` | Run evaluation suite |
| GET | `/api/evaluations/latest` | Get latest evaluation results |
| GET | `/api/health` | Health check (no auth required) |

## Test Commands

```bash
# Backend tests (30 tests)
cd backend
mvn clean test

# Frontend build
cd frontend
npm run build
```

## Evaluation

Run the evaluation via API:
```bash
curl -X POST http://localhost:8080/api/evaluations/run \
  -H "X-Auth-Token: trustdesk-demo-token-2026"
```

Or get the latest results:
```bash
curl http://localhost:8080/api/evaluations/latest \
  -H "X-Auth-Token: trustdesk-demo-token-2026"
```

The evaluation runs all 8 cases from `data/eval_cases.jsonl` and measures:
- **Category accuracy** - correct ticket classification
- **Priority accuracy** - correct priority assignment
- **Citation coverage** - required KB documents cited
- **Unsafe action block rate** - disallowed actions prevented
- **Escalation accuracy** - correct escalation decisions

## Security Design

### Authentication
- Demo token-based authentication via `X-Auth-Token` header
- All `/api/**` endpoints require valid token

### Guardrails (enforced in backend)
- **Prompt injection detection** - regex-based pattern matching for override attempts
- **Identity bypass prevention** - detects requests to skip verification
- **Secret disclosure prevention** - blocks requests for system prompts, API keys, internal notes
- **Coupon amount limits** - max INR 1000 enforced
- **Tool category restrictions** - tools only allowed for matching ticket categories
- **Adversarial document filtering** - KB-ADVERSARIAL-001 excluded from search results

### Adversarial Cases Handled
| Ticket | Threat | Response |
|--------|--------|----------|
| tkt_9005 | Identity bypass request | Requires verification, escalates to human |
| tkt_9006 | Prompt injection for coupon | Detects injection, refuses, escalates |
| tkt_9007 | Secret disclosure request | Refuses to reveal internals, escalates |

## Approval Workflow

1. AI recommends an action (e.g., `create_replacement_order`)
2. Action is created with status `approval_required`
3. Human reviewer approves or rejects via API
4. Only approved actions are executed
5. Idempotency key prevents duplicate actions

Supported approval-gated actions:
- `create_replacement_order` - for damaged/defective items
- `start_refund_review` - for billing issues

## AI Provider

The system uses a **deterministic rule-based engine** as the AI provider. This is clearly documented as a fallback when no LLM API key is configured. The engine:
- Classifies tickets using keyword matching, customer context, and order status
- Generates professional responses using templates with policy citations
- Makes all decisions based on the actual knowledge base policies
- Produces repeatable, deterministic results suitable for evaluation

This is NOT a real LLM - it is a rule-based system that demonstrates the complete workflow.

## Key Design Decisions

1. **SQLite** - Zero-config persistence, no external services needed
2. **Rule-based triage** - Deterministic, testable, no API keys required
3. **Keyword retrieval** - Simple but effective search over KB documents
4. **Policy-grounded responses** - All draft replies cite actual KB documents
5. **Backend guardrails** - All security rules enforced server-side, not just frontend

## Known Limitations

1. **No real LLM integration** - Uses rule-based fallback; add LLM API key support for production
2. **Keyword search only** - No vector embeddings or semantic search
3. **Simple auth** - Demo token only, no role-based access control
4. **Single-instance SQLite** - Not suitable for production concurrent access
5. **No draft editing workflow** - Drafts are generated but not editable
6. **Limited answer_requirements checking** - Eval checks structure but not natural language requirements

## Original Capstone Documentation

- `TRUSTDESK_PROBLEM_STATEMENT.md` - Full problem statement
- `docs/IMPLEMENTATION_GUIDE.md` - Build order and FAQ
- `docs/API_CONTRACT.md` - API contract reference
- `docs/DATA_MODEL.md` - Data model reference
- `docs/EVALUATION_GUIDE.md` - Evaluation methodology
