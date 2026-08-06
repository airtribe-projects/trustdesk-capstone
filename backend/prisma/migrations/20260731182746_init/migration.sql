-- CreateTable
CREATE TABLE "customers" (
    "customer_id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "orders" (
    "order_id" TEXT NOT NULL PRIMARY KEY,
    "customer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "placed_at" DATETIME NOT NULL,
    "delivered_at" DATETIME,
    "eligible_return_until" DATETIME,
    "total" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "payment_status" TEXT NOT NULL,
    "tracking_number" TEXT,
    "items" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tickets" (
    "ticket_id" TEXT NOT NULL PRIMARY KEY,
    "customer_id" TEXT NOT NULL,
    "order_id" TEXT,
    "channel" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "expected_category" TEXT,
    "expected_priority" TEXT,
    "expected_sentiment" TEXT,
    "expected_escalation" BOOLEAN,
    "expected_actions" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "tickets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "doc_id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_path" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "tool_actions" (
    "action_id" TEXT NOT NULL PRIMARY KEY,
    "ticket_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "risk_level" TEXT NOT NULL,
    "requires_human_approval" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "idempotency_key" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tool_actions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets" ("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "approvals" (
    "approval_id" TEXT NOT NULL PRIMARY KEY,
    "action_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approvals_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "tool_actions" ("action_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "run_id" TEXT NOT NULL PRIMARY KEY,
    "ticket_id" TEXT NOT NULL,
    "run_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "retrieved_doc_ids" TEXT NOT NULL DEFAULT '[]',
    "tool_calls" TEXT NOT NULL DEFAULT '[]',
    "guardrail_results" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_runs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets" ("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "tickets_customer_id_idx" ON "tickets"("customer_id");

-- CreateIndex
CREATE INDEX "tickets_order_id_idx" ON "tickets"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "tool_actions_idempotency_key_key" ON "tool_actions"("idempotency_key");

-- CreateIndex
CREATE INDEX "tool_actions_ticket_id_idx" ON "tool_actions"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "approvals_action_id_key" ON "approvals"("action_id");

-- CreateIndex
CREATE INDEX "agent_runs_ticket_id_idx" ON "agent_runs"("ticket_id");
