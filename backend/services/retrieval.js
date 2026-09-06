// services/retrieval.js
// Simple wrapper around FAISS index for knowledge‑base search.
// Exposes a `search(query, k)` function returning an array of {id, score}.

const fs = require('fs');
const path = require('path');
let faiss = null;
try {
  faiss = require('faiss-node');
} catch (e) {
  console.warn('FAISS not available – retrieval will be a stub');
}

// Load persisted index and ID map (created by load_data.js)
function loadIndex() {
  if (!faiss) return null;
  const storeDir = path.resolve(__dirname, '..', '..', 'store');
  const indexPath = path.join(storeDir, 'kb.index');
  const idMapPath = path.join(storeDir, 'kb_ids.json');
  if (!fs.existsSync(indexPath) || !fs.existsSync(idMapPath)) {
    console.warn('FAISS index or ID map missing');
    return null;
  }
  const index = new faiss.IndexFlatL2(768); // dimension must match what was used in load_data.js
  index.load(indexPath);
  const idMap = JSON.parse(fs.readFileSync(idMapPath, 'utf-8'));
  return { index, idMap };
}

// Placeholder embedding function – in real use replace with LLM embedding model.
function embed(text) {
  // Very naive deterministic pseudo‑embedding: hash the text into a fixed‑size vector.
  const vec = new Array(768).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    vec[i % 768] = (vec[i % 768] + (hash % 1000) / 1000);
  }
  return vec;
}

function search(query, k = 5) {
  const store = loadIndex();
  if (!store) {
    // Return empty result set if index not ready.
    return [];
  }
  const { index, idMap } = store;
  const queryVec = embed(query);
  // Perform search – FAISS returns distances; smaller is more similar.
  const results = index.search(queryVec, k);
  // `results` format from faiss-node: { distances: Float32Array, labels: Int32Array }
  const hits = [];
  for (let i = 0; i < results.labels.length; i++) {
    const label = results.labels[i];
    if (label < 0) continue; // -1 indicates empty
    hits.push({ id: idMap[label], score: results.distances[i] });
  }
  return hits;
}

module.exports = { search };
