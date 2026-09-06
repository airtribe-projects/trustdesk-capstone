// load_data.js
// Reads JSON files from ./data and populates SQLite DB + FAISS index.
// Assumes data files: customers.json, orders.json, tickets.json, knowledge_base/*.json

const fs = require('fs');
const path = require('path');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

// FAISS import – optional, will be a no‑op if unavailable
let faiss = null;
try {
  faiss = require('faiss-node');
} catch (e) {
  console.warn('FAISS not available, skipping vector index');
}

function loadJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function insertCustomers(customers) {
  const stmt = db.prepare('INSERT OR REPLACE INTO customers (id, name, email, metadata) VALUES (?, ?, ?, ?)');
  const insert = db.transaction((list) => {
    for (const c of list) {
      stmt.run(c.id, c.name, c.email, JSON.stringify(c.metadata || {}));
    }
  });
  insert(customers);
}

function insertOrders(orders) {
  const stmt = db.prepare('INSERT OR REPLACE INTO orders (id, customer_id, total, created_at, metadata) VALUES (?, ?, ?, ?, ?)');
  const insert = db.transaction((list) => {
    for (const o of list) {
      stmt.run(o.id, o.customer_id, o.total, o.created_at, JSON.stringify(o.metadata || {}));
    }
  });
  insert(orders);
}

function insertTickets(tickets) {
  const stmt = db.prepare('INSERT OR REPLACE INTO tickets (id, customer_id, order_id, subject, message, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insert = db.transaction((list) => {
    for (const t of list) {
      stmt.run(t.id, t.customer_id, t.order_id, t.subject, t.message, t.created_at, JSON.stringify(t.metadata || {}));
    }
  });
  insert(tickets);
}

function buildFAISSIndex(kbDir) {
  if (!faiss) return null;
  const index = new faiss.IndexFlatL2(768); // placeholder dim, adjust later
  const idMap = [];
  const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const doc = loadJSON(path.join(kbDir, file));
    // Expect doc: { id: "KB-REF001", text: "..." }
    // Simple embedding placeholder: use a random vector (replace with real embedding in production)
    const vec = Array.from({ length: 768 }, () => Math.random());
    index.add(vec);
    idMap.push(doc.id);
  }
  return { index, idMap };
}

function main() {
  const dataRoot = path.resolve(__dirname, '..', 'data');
  const kbDir = path.join(dataRoot, 'knowledge_base');
  const customers = loadJSON(path.join(dataRoot, 'customers.json'));
  const orders = loadJSON(path.join(dataRoot, 'orders.json'));
  const tickets = loadJSON(path.join(dataRoot, 'tickets.json'));

  insertCustomers(customers);
  insertOrders(orders);
  insertTickets(tickets);

  const faissData = buildFAISSIndex(kbDir);
  if (faissData) {
    // Save index and id map for later use
    const indexPath = path.resolve(__dirname, '..', 'store', 'kb.index');
    const idMapPath = path.resolve(__dirname, '..', 'store', 'kb_ids.json');
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
    faissData.index.save(indexPath);
    fs.writeFileSync(idMapPath, JSON.stringify(faissData.idMap, null, 2));
    console.log('FAISS index saved');
  }
}

if (require.main === module) {
  main();
}
