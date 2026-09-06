// backend/index.js
require('dotenv').config();
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { spawn } = require('child_process');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Trace logging middleware
const db = require('./db');
function logTrace(trace) {
  const stmt = db.prepare('INSERT INTO traces (id, ticket_id, run_type, retrieved_doc_ids, guardrail_result) VALUES (?, ?, ?, ?, ?)');
  stmt.run(uuidv4(), trace.ticketId || null, trace.runType, trace.retrievedDocIds ? JSON.stringify(trace.retrievedDocIds) : null, trace.guardrailResult || null);
}
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const trace = {
      ticketId: res.locals.ticketId,
      runType: req.path,
      retrievedDocIds: res.locals.retrievedDocIds,
      guardrailResult: res.locals.guardrailResult,
      duration,
    };
    // Only log if we have meaningful data (e.g., a ticketId or runType)
    if (trace.runType) {
      logTrace(trace);
    }
  });
  next();
});

// Simple demo token middleware
// Token middleware disabled for demo purposes
app.use((req, res, next) => {
  // Allow all requests without auth
  next();
});

const retrieval = require('./services/retrieval');
const guardrail = require('./services/guardrail');

// Search knowledge base
app.get('/search', (req, res) => {
  const query = req.query.q || '';
  const k = parseInt(req.query.k) || 5;
  const results = retrieval.search(query, k);
  // Attach trace data
  res.locals.ticketId = null; // search is not ticket‑specific
  res.locals.retrievedDocIds = results.map(r => r.id);
  res.json({ query, results });
});


// Placeholder routes
// Create a new ticket
app.post('/tickets', (req, res) => {
  const { subject = '', message = '', customerName = '', priority = '', category = '', idempotencyKey = '' } = req.body;
  const ticketId = uuidv4();
  const createdAt = new Date().toISOString();
  const metadata = JSON.stringify({ priority, category, customerName });
  // If idempotencyKey provided, try to find existing ticket
  if (idempotencyKey) {
    const existing = db.prepare('SELECT * FROM tickets WHERE idempotency_key = ?').get(idempotencyKey);
    if (existing) {
      return res.status(200).json({
        id: existing.id,
        subject: existing.subject,
        message: existing.message,
        createdAt: existing.created_at,
        priority,
        category,
        customerName,
      });
    }
  }
  const stmt = db.prepare('INSERT INTO tickets (id, customer_id, order_id, subject, message, created_at, metadata, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(ticketId, null, null, subject, message, createdAt, metadata, idempotencyKey || null);
  res.status(201).json({ id: ticketId, subject, message, createdAt, priority, category, customerName });
});

// List tickets ordered by newest first
app.get('/tickets', (req, res) => {
  const stmt = db.prepare('SELECT * FROM tickets ORDER BY created_at DESC');
  const rows = stmt.all();
  // Parse metadata JSON for each ticket
  const tickets = rows.map(row => {
    let meta = {};
    try {
      meta = JSON.parse(row.metadata || '{}');
    } catch (e) {
      // ignore parse errors, keep meta empty
    }
    return {
      ...row,
      priority: meta.priority || '',
      category: meta.category || '',
      customerName: meta.customerName || ''
    };
  });
  res.json({ tickets });
});

// duplicate placeholder route removed

const triage = require('./services/triage');

app.post('/triage/:id', (req, res) => {
  const ticketId = req.params.id;
  const mockTicket = { id: ticketId, subject: req.body.subject || '', message: req.body.message || '' };
  const result = triage.triageTicket(mockTicket);
  // Persist triage result
  const stmt = db.prepare('INSERT OR REPLACE INTO triages (ticket_id, category, priority, escalation, created_at) VALUES (?, ?, ?, ?, ?)');
  stmt.run(ticketId, result.category, result.priority, result.escalate ? 1 : 0, new Date().toISOString());
  res.json(result);
});

const draftService = require('./services/draft');



app.post('/draft/:id', (req, res) => {
  const ticketId = req.params.id;
  const mockTicket = {
    id: ticketId,
    subject: req.body.subject || 'No subject',
    customerName: req.body.customerName || 'Customer',
    created_at: req.body.created_at || new Date().toISOString()
  };
  const docs = retrieval.search(mockTicket.subject, 3);
  const result = draftService.generateDraft(mockTicket, docs.map(r => ({ id: r.id })));
  // Guardrail check
  const guard = guardrail.checkGuardrails(result.draft, docs);
  // Warranty / return eligibility (30‑day window)
  const ticketDate = new Date(mockTicket.created_at);
  const now = new Date();
  const diffDays = Math.floor((now - ticketDate) / (1000 * 60 * 60 * 24));
  const warrantyEligible = diffDays <= 30;
  // Attach trace data
  res.locals.ticketId = ticketId;
  res.locals.retrievedDocIds = docs.map(r => r.id);
  res.locals.guardrailResult = guard.passed ? 'passed' : 'failed';
  res.json({ ...result, guardrail: guard, warrantyEligible });
});

// db already required above
const path = require('path');

app.post('/action/:id', (req, res) => {
  const ticketId = req.params.id;
  const action = req.body.action || 'unknown';
  const proposalId = uuidv4();
  const idempotencyKey = uuidv4();
  const createdAt = new Date().toISOString();
  // Store proposal in SQLite
  const stmt = db.prepare('INSERT INTO proposals (id, ticket_id, action, idempotency_key, status, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(proposalId, ticketId, action, idempotencyKey, 'pending', createdAt);
  // Attach trace data
  res.locals.ticketId = ticketId;
  res.locals.retrievedDocIds = null;
  res.locals.guardrailResult = null;
  res.json({ proposalId, idempotencyKey, action });
});

app.post('/approve/:proposalId', (req, res) => {
  const proposalId = req.params.proposalId;
  const { idempotencyKey } = req.body;
  const stmtSelect = db.prepare('SELECT * FROM proposals WHERE id = ?');
  const proposal = stmtSelect.get(proposalId);
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
  if (proposal.idempotency_key !== idempotencyKey) return res.status(400).json({ error: 'Invalid idempotency key' });
  if (proposal.status === 'approved') return res.json({ status: 'already approved', proposalId });
  const stmtUpdate = db.prepare('UPDATE proposals SET status = ?, completed_at = ? WHERE id = ?');
  stmtUpdate.run('approved', new Date().toISOString(), proposalId);
  // Trace data
  res.locals.ticketId = proposal.ticket_id;
  res.locals.retrievedDocIds = null;
  res.locals.guardrailResult = null;
  res.json({ status: 'approved', proposalId });
});

app.post('/eval/run', (req, res) => {
  // Spawn evaluation runner as a detached background process
  const child = spawn('node', [path.join(__dirname, 'run_evals.js')], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  res.json({ status: 'evaluation started', pid: child.pid });
});

// Return evaluation summary if available
app.get('/eval/summary', (req, res) => {
  const summaryPath = path.join(__dirname, 'eval_summary.json');
  if (fs.existsSync(summaryPath)) {
    const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    res.json(data);
  } else {
    res.status(404).json({ error: 'Summary not generated yet' });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
