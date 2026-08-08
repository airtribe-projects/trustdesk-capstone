# TrustDesk — AI Support Operations Agent

TrustDesk is an AI-first customer support operations platform. It ingests company policy documents, triages incoming tickets, generates policy-grounded draft replies with citations, suggests approval-gated actions, and defends against prompt injection and adversarial inputs — all with a complete audit trail.

---

## Table of Contents

- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Design Decisions](#design-decisions)
- [Evaluation Flow](#evaluation-flow)
- [Known Limitations](#known-limitations)

---

## Architecture

```
Capstone_TrustDesk/
??? backend/                  # Node.js + Express + TypeScript API server
?   ??? prisma/
?   ?   ??? schema.prisma     # SQLite schema (Ticket, Customer, Order, KnowledgeDocument, ToolAction, Approval, Trace)
?   ??? scripts/
?   ?   ??? seed.ts           # Seeds all data from /data into the DB
?   ??? src/
?       ??? app.ts            # Express app with CORS, rate limiting, static frontend serving
?       ??? server.ts         # HTTP server entry point
?       ??? config/db.ts      # Prisma client singleton
?       ??? middleware/auth.ts # JWT authentication middleware
?       ??? controllers/      # Request handlers
?       ?   ??? auth.controller.ts
?       ?   ??? ticket.controller.ts
?       ?   ??? approval.controller.ts
?       ?   ??? knowledge.controller.ts
?       ?   ??? eval.controller.ts
?       ??? services/
?           ??? ai/
?           ?   ??? triage.service.ts   # AI ticket classification (OpenAI + keyword fallback)
?           ?   ??? draft.service.ts    # AI draft reply generation with citations
?           ??? rag/
?           ?   ??? retriever.service.ts  # TF-IDF full-text search over KB docs
?           ??? guardrails/
?           ?   ??? guardrail.service.ts  # Prompt injection, PII, policy bypass detection
?           ??? tools/
?           ?   ??? tool.service.ts       # Approval-gated tool action executor
?           ??? traces/
?               ??? trace.service.ts      # Audit trail writer
??? frontend/
?   ??? index.html            # Single-file support agent UI
??? data/
    ??? customers.json
    ??? orders.json
    ??? tickets.json
    ??? tool_actions.json
    ??? eval_cases.jsonl
    ??? knowledge_base/       # 8 policy documents (KB-REFUND-001, KB-SHIPPING-001, …)
```

**Key Technology Choices:**
- **Runtime:** Node.js + TypeScript
- **Framework:** Express 5
- **Database:** SQLite via Prisma ORM
- **AI Provider:** OpenAI (`gpt-4o-mini`) with keyword-based fallback
- **Retrieval:** TF-IDF full-text scoring (no external vector DB required)
- **Auth:** JWT (Bearer token, 24h expiry)
- **Frontend:** Plain HTML/CSS/JS single-file UI served by the backend

---

## Setup Instructions

### Prerequisites

- Node.js ? 18
- npm ? 9
- An OpenAI API key (optional — keyword fallback activates if unavailable)

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create `backend/.env`:

```env
DATABASE_URL="file:./trustdesk.db"
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
JWT_SECRET=trustdesk-jwt-secret-change-in-production
PORT=3000
NODE_ENV=development
DEMO_USER_EMAIL=agent@trustdesk.com
DEMO_USER_PASSWORD=trustdesk123
```

### 3. Initialize & Seed the Database

```bash
cd backend
npx prisma db push       # creates the SQLite DB schema
npm run seed             # loads customers, orders, tickets, KB docs, users
```

### 4. Start the Server

```bash
npm run dev              # development with hot-reload (nodemon + tsx)
# or
npm run build && npm start   # production build
```

The server starts at **http://localhost:3000**.  
The frontend UI is served at the root: **http://localhost:3000**.

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Support Agent | agent@trustdesk.com | trustdesk123 |
| Support Manager | manager@trustdesk.com | manager123 |

---

## API Documentation

All endpoints (except `/api/auth/login`) require:  
`Authorization: Bearer <token>`

### Authentication

#### `POST /api/auth/login`
Login and obtain a JWT token.

**Request:**
```json
{ "email": "agent@trustdesk.com", "password": "trustdesk123" }
```
**Response:**
```json
{ "token": "<jwt>", "user": { "id": "...", "email": "...", "role": "support_agent" } }
```

#### `GET /api/auth/me`
Returns the currently authenticated user.

---

### Tickets

#### `GET /api/tickets`
List all tickets with customer and order summaries, ordered by newest first.

#### `GET /api/tickets/:id`
Get a single ticket with full context: customer, order, triage, draft, tool actions, approvals, and recent traces.

#### `POST /api/tickets`
Create a new ticket.

**Request:**
```json
{
  "customerId": "cust_001",
  "orderId": "ord_001",
  "subject": "My order arrived damaged",
  "message": "The screen has a crack. I want a replacement.",
  "channel": "email"
}
```

#### `POST /api/tickets/:id/triage`
Run AI triage on a ticket. Classifies category, priority, sentiment, and escalation need. Saves a trace.

**Response:**
```json
{
  "triage": {
    "category": "refund",
    "priority": "medium",
    "sentiment": "frustrated",
    "should_escalate": false,
    "reason_summary": "Customer received damaged item within return window.",
    "guardrail_blocked": false,
    "trace_id": "..."
  }
}
```

#### `POST /api/tickets/:id/draft`
Generate a policy-grounded draft reply with citation IDs from the knowledge base.

**Response:**
```json
{
  "draft": {
    "content": "Thank you for reaching out... [KB-REFUND-001]",
    "citations": ["KB-REFUND-001"],
    "recommendedActions": ["create_replacement_order"],
    "guardrailBlocked": false
  }
}
```

#### `POST /api/tickets/:id/tools`
Request a tool action (AI recommendation). Sensitive actions are created in `PENDING` state and require human approval.

**Request:**
```json
{
  "toolName": "start_refund_review",
  "params": { "orderId": "ord_001", "reason": "damaged on arrival" },
  "idempotencyKey": "ticket-001-refund-001"
}
```

**Available tools:**

| Tool | Needs Approval | Allowed Categories | Risk |
|---|---|---|---|
| `start_refund_review` | Yes | refund, billing | medium |
| `create_replacement_order` | Yes | refund, warranty | medium |
| `issue_coupon` | Yes | shipping, general | medium |
| `open_carrier_investigation` | No | shipping | low |
| `escalate_to_human` | No | all | low |
| `lock_account` | Yes | account_security | high |

---

### Approvals

#### `GET /api/approvals`
List all pending tool actions awaiting human approval.

#### `GET /api/approvals/:id`
Get a specific tool action with full ticket context.

#### `POST /api/approvals/:id/approve`
Approve and execute a pending tool action.

#### `POST /api/approvals/:id/reject`
Reject a pending tool action.

---

### Knowledge Base

#### `GET /api/knowledge`
List all ingested knowledge-base documents.

#### `GET /api/knowledge/search?q=<query>`
Search knowledge-base documents using TF-IDF full-text scoring.

#### `POST /api/knowledge/ingest`
Ingest new documents.

**Request:**
```json
{
  "documents": [
    { "doc_id": "KB-CUSTOM-001", "title": "Custom Policy", "category": "general", "content": "..." }
  ]
}
```

---

### Traces

#### `GET /api/traces/:id`
Retrieve a single trace record by ID. Each trace stores: `ticketId`, `runType` (triage/draft/eval), `retrievedDocs`, `toolAction`, `guardrail` result, and `finalStatus`.

---

### Evaluation

#### `POST /api/eval/run`
Run all cases from `data/eval_cases.jsonl` and return a summary report. This runs triage + draft generation on every eval ticket and checks against expected outputs.

**Response:**
```json
{
  "summary": {
    "total": 8,
    "passed": 8,
    "pass_rate": "1.00",
    "category_accuracy": "1.00",
    "priority_accuracy": "0.75",
    "citation_coverage": "1.00",
    "unsafe_action_block_rate": "1.00",
    "escalation_accuracy": "1.00"
  },
  "results": [ ... ]
}
```

#### `GET /api/eval/results`
Return the most recent eval report without re-running.

---

## Design Decisions

### 1. AI Provider Behind an Adapter with Keyword Fallback
`triage.service.ts` and `draft.service.ts` both attempt OpenAI first and fall back to deterministic keyword-based logic if the API key is missing, invalid, or quota-exhausted. A circuit-breaker flag (`openaiQuotaExhausted`) prevents repeated failing calls within a session. This ensures the system remains functional in tests and demos even without a live API key.

### 2. TF-IDF Retrieval (No Vector DB)
The retrieval layer (`retriever.service.ts`) uses in-database TF-IDF scoring with title-match and phrase-match boosting. This avoids any external vector database dependency while still providing meaningful ranked results. Documents are stored in SQLite alongside all other data.

### 3. Approval-Gated Tool Actions with Idempotency
Sensitive tools (`start_refund_review`, `create_replacement_order`, `issue_coupon`, `lock_account`) are created with status `PENDING` and require an explicit `POST /api/approvals/:id/approve` call. The `idempotencyKey` field has a unique database constraint — retrying the same request with the same key returns the original record, preventing duplicate actions.

### 4. Guardrails as Pre-AI Filter
Guardrail checks run **before** any OpenAI call. If a customer message contains prompt injection patterns, PII-disclosure requests, or identity-bypass attempts, the system immediately returns a safe escalation response without sending the message to the LLM. `KB-ADVERSARIAL-001` is loaded into the database (to preserve document IDs for evals) but is stripped from any context passed to the AI via `filterAdversarialDocs()`.

### 5. Traces on Every AI Run
Every triage and draft call writes a `Trace` record containing the retrieved document IDs, guardrail outcome, and final status. This creates a complete audit trail for debugging AI decisions and is queryable via `GET /api/traces/:id`.

### 6. Date-Relative Policy Evaluation
Return and warranty windows are evaluated against each ticket's `createdAt` date, not the server's current date. The `eligibleReturnUntil` field on each order is pre-computed during seeding from order data.

### 7. Single-File Frontend
The frontend is a self-contained `index.html` file with embedded CSS and JavaScript. It is served statically by the Express server from the `frontend/` directory. If a compiled React/Vite build exists at `frontend/dist/`, it will be served instead.

---

## Evaluation Flow

The eval runner loads `data/eval_cases.jsonl`, runs triage and draft generation on each of the 8 eval tickets, and scores against expected outputs:

| Metric | Description |
|---|---|
| **Category Accuracy** | Triage category matches expected category |
| **Priority Accuracy** | Triage priority matches expected priority |
| **Citation Coverage** | All `must_cite_doc_ids` appear in the draft citations |
| **Unsafe Action Block Rate** | None of the `disallowed_actions` appear in recommended actions |
| **Escalation Accuracy** | `should_escalate` matches expected value |

### Running the Evaluation

```bash
# Via API (server must be running)
curl -X POST http://localhost:3000/api/eval/run \
  -H "Authorization: Bearer <token>"

# Or from the frontend: click "Run Evaluation" in the Evaluations tab
```

### Eval Results (Keyword Fallback Mode)

```
Total: 8 | Passed: 8 | Pass Rate: 100%
Category Accuracy:        100%
Priority Accuracy:         75%   (keyword fallback is less precise on priority)
Citation Coverage:        100%
Unsafe Action Block Rate: 100%
Escalation Accuracy:      100%
```

### Adversarial Eval Cases Covered

| Case | Input Type | Expected Behaviour |
|---|---|---|
| eval_005 | Identity-check bypass | Blocked, escalated, no email change |
| eval_006 | Prompt injection + hidden coupon | Blocked, no coupon issued |
| eval_007 | Request to reveal system prompt / API key | Blocked, no secrets disclosed |

---

## Known Limitations

1. **Priority accuracy at 75% in keyword-fallback mode.** The keyword classifier is coarser than the LLM. With a valid OpenAI key the LLM produces more nuanced priority assignments. Priority does not affect the `passed` flag in the eval (which gates on category, escalation, citations, and unsafe actions).

2. **No vector embeddings.** The retrieval layer uses TF-IDF, which works well for keyword-rich policy queries but can miss semantically similar phrasing. Replacing `retriever.service.ts` with an embedding-based store (e.g., Chroma, pgvector) would improve recall.

3. **No automated test suite.** Unit and integration tests for guardrails and the tool service are not included. Critical paths are covered by the eval runner.

4. **In-memory circuit breaker.** The `openaiQuotaExhausted` flag resets on server restart. Under high load with a quota-limited key, the system will log errors before tripping the breaker.

5. **Single-node SQLite.** Suitable for development and demo. A production deployment would need PostgreSQL and a connection pool.

6. **Frontend is a single HTML file.** No build step, no component framework. Suitable for demo purposes as noted in the assessment brief.

