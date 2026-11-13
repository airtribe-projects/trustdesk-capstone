# TrustDesk Implementation Plan

## Requirements Summary

### Must Have
1. **Data Loading**: Load customers, orders, tickets, tool catalog, eval cases, and KB docs into SQLite
2. **Ticket APIs & Frontend**: REST APIs for ticket CRUD, simple React dashboard
3. **Knowledge Retrieval**: Keyword-based search across KB documents with citations
4. **AI Triage**: Classify tickets by category, priority, sentiment, escalation need
5. **Cited Draft Replies**: Generate grounded draft responses with policy citations
6. **Approval-Gated Action**: `create_replacement_order` with human approval workflow
7. **Guardrails**: Handle adversarial cases (tkt_9005, tkt_9006, tkt_9007) safely
8. **Minimal Traces**: Store audit trail for every AI run
9. **Evaluation Engine**: Run eval_cases.jsonl and produce metrics report

## Architecture

### Backend (Java 21 + Spring Boot 3)
```
com.trustdesk
├── controller/     - REST API endpoints
├── service/        - Business logic
├── repository/     - Data access (JPA + SQLite)
├── model/          - JPA entities
├── dto/            - API request/response DTOs
├── config/         - Spring configuration
├── exception/      - Centralized error handling
├── security/       - Authentication filter
├── guardrails/     - Input validation, prompt injection detection
├── retrieval/      - Knowledge base search engine
├── evaluation/     - Eval runner and metrics
├── audit/          - Trace storage
└── action/         - Tool action management
```

### Frontend (React + TypeScript + Vite)
```
frontend/
├── src/
│   ├── components/  - Reusable UI components
│   ├── pages/       - Page-level components
│   ├── services/    - API client
│   ├── types/       - TypeScript interfaces
│   └── App.tsx      - Main app with routing
```

### Database: SQLite
- Zero configuration, no external services
- Spring Data JPA with Hibernate SQLite dialect

## Implementation Phases

### Phase 1: Project Scaffold
- Spring Boot project with Maven
- SQLite + JPA configuration
- Entity models for all data types

### Phase 2: Data Loading
- JSON file loader for customers, orders, tickets, tool_actions
- KB markdown parser preserving doc IDs
- JSONL parser for eval cases
- Startup data seeder

### Phase 3: Core APIs
- Ticket CRUD endpoints
- Customer/Order lookup
- Knowledge base search

### Phase 4: AI Triage
- Rule-based triage engine (deterministic fallback)
- Category, priority, sentiment, escalation classification
- Context-aware using customer tier, order status, KB policies

### Phase 5: Draft Response Generation
- Template-based response generator with KB citations
- Policy-grounded responses
- Escalation for unsupported/unsafe requests

### Phase 6: Guardrails
- Prompt injection detection
- Identity verification enforcement
- Secret disclosure prevention
- Coupon limit enforcement
- Category-based tool restrictions

### Phase 7: Approval Workflow
- create_replacement_order action
- start_refund_review action
- Pending → Approved/Rejected → Executed lifecycle
- Idempotency key enforcement

### Phase 8: Audit & Evaluation
- Agent run traces
- Evaluation runner over eval_cases.jsonl
- Metrics: category accuracy, priority accuracy, citation coverage, etc.

### Phase 9: React Frontend
- Ticket queue with status indicators
- Ticket detail view with customer/order context
- Triage panel, KB search, draft reply panel
- Action approval/rejection controls
- Evaluation dashboard

### Phase 10: Testing & Documentation
- JUnit 5 tests for all critical flows
- Frontend build verification
- README update
- GitHub Actions CI

## API Design

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tickets | List all tickets |
| GET | /api/tickets/{id} | Get ticket with context |
| POST | /api/tickets/{id}/triage | Run AI triage |
| POST | /api/tickets/{id}/draft-reply | Generate cited draft |
| GET | /api/knowledge/search?q= | Search knowledge base |
| GET | /api/tickets/{id}/traces | Get audit traces |
| POST | /api/tickets/{id}/actions | Request tool action |
| GET | /api/actions/{id} | Get action status |
| POST | /api/actions/{id}/approve | Approve action |
| POST | /api/actions/{id}/reject | Reject action |
| POST | /api/evaluations/run | Run evaluation suite |
| GET | /api/evaluations/latest | Get latest eval results |

## Security Controls
- Demo token authentication (X-Auth-Token header)
- All customer input treated as untrusted
- Prompt injection detection via pattern matching
- Identity verification enforcement for account changes
- Coupon amount limit (max INR 1000)
- Tool category restrictions from tool_actions.json
- Human approval required for sensitive actions
- No secrets/prompts disclosed in responses

## Evaluation Approach
- Deterministic rule-based engine ensures repeatable results
- Metrics: category_accuracy, priority_accuracy, citation_coverage, unsafe_action_block_rate, escalation_accuracy
- Per-case results with expected vs actual comparison
- Adversarial case specific reporting
