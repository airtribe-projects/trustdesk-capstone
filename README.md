# TrustDesk Capstone

An AI-powered customer support assistant that helps support agents analyze tickets, retrieve relevant knowledge base articles, generate grounded replies, recommend operational actions, and evaluate AI performance using a curated benchmark dataset.

---

## Features

### AI Ticket Analysis
- Classifies customer tickets by category
- Predicts ticket priority
- Determines whether escalation is required
- Uses Retrieval-Augmented Generation (RAG) with internal knowledge documents

### Grounded Reply Generation
- Generates customer replies based only on retrieved knowledge
- Includes supporting knowledge base citations
- Prevents unsupported or hallucinated responses

### Human Approval Workflow
Operational actions requiring approval include:
- Replacement orders
- Other medium/high-risk tool actions

Workflow:
1. AI recommends an operational action
2. Agent requests execution
3. Human reviewer approves or rejects
4. Approved action can be executed

### Evaluation Dashboard
Runs the evaluation benchmark against the curated dataset and reports:

- Cases Evaluated
- Category Accuracy
- Priority Accuracy
- Escalation Accuracy
- Citation Coverage
- Guardrail Pass Rate
- Overall Score

The evaluation compares AI predictions against expected labels stored with each evaluation ticket.

### Operational Logging

Each AI analysis stores an AgentRun trace containing:

- Retrieved knowledge documents
- Tool calls
- Guardrail results
- Analysis status

---

# Technology Stack

## Frontend

- React
- Vite
- CSS

## Backend

- Node.js
- Express
- Prisma ORM
- SQLite

## AI

- Google Gemini API
- Retrieval-Augmented Generation (RAG)

---

# Project Structure

```
trustdesk-capstone/

├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── adapters/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── README.md
```

---

# Installation

## Clone the repository

```bash
git clone <repository-url>
cd trustdesk-capstone
```

---

## Backend Setup

```bash
cd backend

npm install
```

Create a `.env` file.

Example:

```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
PORT=3000
```

Run Prisma:

```bash
npx prisma generate
```

Seed the database:

```bash
npx prisma db seed
```

Start the backend:

```bash
npm run dev
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

The frontend runs on

```
http://localhost:5173
```

The backend runs on

```
http://localhost:3000
```

---

# Demo Workflow

## AI Ticket Analysis

1. Select a ticket.
2. Click **Analyze AI**.
3. Review:
   - Classification
   - Draft reply
   - Citations
   - Recommended action

---

## Reply

Click **Reply** to:

- Review the generated draft
- Edit if needed
- Send the response

---

## Human Approval

For tickets requiring operational actions:

1. Request replacement
2. Review approval request
3. Approve or reject
4. Execute approved action

---

## Evaluation

Open the **Evaluation** page.

The dashboard evaluates every benchmark ticket and reports:

- Classification accuracy
- Priority accuracy
- Escalation accuracy
- Citation validation
- Guardrail performance
- Overall evaluation score

---

# API Endpoints

## Ticket APIs

```
GET /tickets
```

```
GET /tickets/:ticketId
```

```
POST /tickets/:ticketId/analyze
```

---

## Tool Actions

```
GET /tickets/:ticketId/tool-actions
```

```
POST /tickets/:ticketId/tool-actions/replacement
```

```
POST /tool-actions/:actionId/decision
```

```
POST /tool-actions/:actionId/execute
```

---

## Evaluation

```
GET /evaluation
```

Runs the benchmark across the complete evaluation dataset.

---

## Demo Reset

```
POST /demo/reset
```

Removes operational tool actions and approvals while preserving the seeded dataset.

---

# Evaluation Metrics

The evaluation benchmark measures:

- Category Accuracy
- Priority Accuracy
- Escalation Accuracy
- Citation Coverage
- Guardrail Pass Rate
- Overall AI Score

---

# Security Features

- Retrieval-Augmented Generation
- Prompt injection resistance
- Citation validation
- Human approval for sensitive operations
- Operational action logging
- Guardrail evaluation

---

# Notes

- The evaluation endpoint performs live Gemini inference across the benchmark dataset.
- A valid Gemini API key is required.
- Free-tier Gemini API quotas may temporarily prevent evaluation if daily request limits are exceeded.
- Human approval is required before executing protected operational actions.

---

# Docker

## Prerequisites

- Docker Desktop (or Docker Engine with the Compose plugin)
- A valid `GEMINI_API_KEY` in `backend/.env`

The backend environment file must include at least:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

## Build and start

From the project root:

```bash
docker compose up --build
```

The frontend is available at `http://localhost:5173` and the backend at `http://localhost:3000`.

The Compose setup gives the frontend a Docker-network backend target while preserving the existing local-development proxy target. The SQLite database is stored in a named Docker volume and persists across container restarts.

## Stop

```bash
docker compose down
```

This stops the containers and retains the SQLite volume. To also remove persisted Docker data, run:

```bash
docker compose down --volumes
```

## Rebuild

After Docker-related or dependency changes:

```bash
docker compose up --build
```

---

# Author

**Rudransh Singh**

TrustDesk Capstone Project
