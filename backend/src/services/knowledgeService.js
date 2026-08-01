const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const TOP_K = 3;
const ADVERSARIAL_DOCUMENT_ID = "KB-ADVERSARIAL-001";
const ADVERSARIAL_RELEVANCE_TERMS = new Set([
  "adversarial",
  "integration",
  "note",
  "ordersync",
  "vendor",
  "widget",
]);
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "can",
  "do",
  "for",
  "from",
  "has",
  "have",
  "i",
  "if",
  "in",
  "is",
  "it",
  "me",
  "my",
  "no",
  "not",
  "of",
  "on",
  "or",
  "our",
  "please",
  "the",
  "this",
  "to",
  "was",
  "with",
  "you",
  "your",
]);

function queryTerms(query) {
  return [
    ...new Set(
      (query.toLowerCase().match(/[a-z0-9]+/g) || []).filter(
        (term) => term.length > 2 && !STOP_WORDS.has(term),
      ),
    ),
  ];
}

function termCounts(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).reduce((counts, term) => {
    counts.set(term, (counts.get(term) || 0) + 1);
    return counts;
  }, new Map());
}

function relevanceScore(document, terms) {
  const titleTerms = termCounts(document.title);
  const contentTerms = termCounts(document.content);
  const documentIdTerms = termCounts(document.docId);

  return terms.reduce(
    (score, term) =>
      score +
      (titleTerms.get(term) || 0) * 5 +
      (documentIdTerms.get(term) || 0) * 3 +
      (contentTerms.get(term) || 0),
    0,
  );
}

function isEligibleResult(document, terms) {
  if (document.relevanceScore === 0) {
    return false;
  }

  if (document.docId !== ADVERSARIAL_DOCUMENT_ID) {
    return true;
  }

  return terms.some((term) => ADVERSARIAL_RELEVANCE_TERMS.has(term));
}

function createSnippet(content, terms) {
  const normalizedContent = content.replace(/\s+/g, " ").trim();
  const lowerCaseContent = normalizedContent.toLowerCase();
  const matchIndex = terms
    .map((term) => lowerCaseContent.indexOf(term))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  const start = Math.max(0, (matchIndex ?? 0) - 60);
  const end = Math.min(normalizedContent.length, start + 180);

  return `${start > 0 ? "..." : ""}${normalizedContent.slice(start, end)}${
    end < normalizedContent.length ? "..." : ""
  }`;
}

function getValidatedTerms(query) {
  if (typeof query !== "string" || !query.trim()) {
    throw new AppError("Query parameter 'q' is required", 400);
  }

  const terms = queryTerms(query);
  if (terms.length === 0) {
    throw new AppError("Query parameter 'q' must contain searchable text", 400);
  }

  return terms;
}

async function getRelevantKnowledgeDocuments(query) {
  const terms = getValidatedTerms(query);

  const documents = await prisma.knowledgeDocument.findMany({
    select: {
      docId: true,
      title: true,
      content: true,
    },
  });

  return documents
    .map((document) => ({
      ...document,
      docId: document.docId,
      title: document.title,
      relevanceScore: relevanceScore(document, terms),
    }))
    .filter((document) => isEligibleResult(document, terms))
    .sort(
      (left, right) =>
        right.relevanceScore - left.relevanceScore || left.docId.localeCompare(right.docId),
    )
    .slice(0, TOP_K);
}

async function searchKnowledgeDocuments(query) {
  const results = await getRelevantKnowledgeDocuments(query);

  return {
    query: query.trim(),
    results: results.map((document) => ({
      docId: document.docId,
      title: document.title,
      relevanceScore: document.relevanceScore,
      snippet: createSnippet(document.content, queryTerms(query)),
    })),
  };
}

module.exports = {
  getRelevantKnowledgeDocuments,
  searchKnowledgeDocuments,
};
