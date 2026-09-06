// backend/db.js
const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '..', 'store', 'trustdesk.db');
const db = new Database(dbPath);

// Initialize tables if not exist
const init = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      metadata TEXT
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      total REAL,
      created_at TEXT,
      metadata TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      order_id TEXT,
      subject TEXT,
      message TEXT,
      created_at TEXT,
      metadata TEXT,
      idempotency_key TEXT UNIQUE,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      ticket_id TEXT,
      action TEXT,
      idempotency_key TEXT,
      status TEXT,
      completed_at TEXT,
      created_at TEXT,
      FOREIGN KEY(ticket_id) REFERENCES tickets(id)
    );
    CREATE TABLE IF NOT EXISTS triages (
      ticket_id TEXT PRIMARY KEY,
      category TEXT,
      priority TEXT,
      escalation INTEGER,
      created_at TEXT,
      FOREIGN KEY(ticket_id) REFERENCES tickets(id)
    );
    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      ticket_id TEXT,
      run_type TEXT,
      retrieved_doc_ids TEXT,
      guardrail_result TEXT,
      final_status TEXT,
      created_at TEXT,
      FOREIGN KEY(ticket_id) REFERENCES tickets(id)
    );
  `);
};

init();

module.exports = db;
