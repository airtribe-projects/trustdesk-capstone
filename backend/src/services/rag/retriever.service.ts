import { prisma } from '../../config/db';

export interface SearchResult {
  doc_id: string;
  title: string;
  snippet: string;
  score: number;
  content: string;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function scoreDocument(query: string, content: string, title: string): number {
  const queryTokens = tokenize(query);
  const docTokens = tokenize(content + ' ' + title);
  const docMap = new Map<string, number>();

  for (const t of docTokens) {
    docMap.set(t, (docMap.get(t) || 0) + 1);
  }

  let score = 0;
  for (const qt of queryTokens) {
    if (docMap.has(qt)) {
      score += 1 + Math.log((docMap.get(qt) || 1));
    }
  }

  // Boost title matches
  const titleTokens = new Set(tokenize(title));
  for (const qt of queryTokens) {
    if (titleTokens.has(qt)) score += 2;
  }

  // Boost exact phrase match
  const lowerContent = (content + ' ' + title).toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (lowerContent.includes(lowerQuery)) score += 5;

  return queryTokens.length > 0 ? score / queryTokens.length : 0;
}

function extractSnippet(content: string, query: string, length = 250): string {
  const lower = content.toLowerCase();
  const terms = tokenize(query);

  let bestPos = 0;
  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx !== -1) {
      bestPos = idx;
      break;
    }
  }

  const start = Math.max(0, bestPos - 40);
  const snippet = content.substring(start, start + length);
  return (start > 0 ? '...' : '') + snippet + (start + length < content.length ? '...' : '');
}

export async function searchKnowledge(query: string, topK = 5): Promise<SearchResult[]> {
  const docs = await prisma.knowledgeDocument.findMany();

  const scored = docs
    .map((doc) => ({
      doc_id: doc.id,
      title: doc.title,
      snippet: extractSnippet(doc.content, query),
      score: scoreDocument(query, doc.content, doc.title),
      content: doc.content,
    }))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

export async function getDocumentById(docId: string) {
  return prisma.knowledgeDocument.findUnique({ where: { id: docId } });
}
