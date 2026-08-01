const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

function queryTerms(query) {
  return [...new Set(query.toLowerCase().match(/[a-z0-9]+/g) || [])];
}

function occurrenceCount(text, term) {
  return text.split(term).length - 1;
}

function relevanceScore(document, terms) {
  const title = document.title.toLowerCase();
  const content = document.content.toLowerCase();

  return terms.reduce(
    (score, term) =>
      score + occurrenceCount(title, term) * 3 + occurrenceCount(content, term),
    0,
  );
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

async function searchKnowledgeDocuments(query) {
  if (typeof query !== "string" || !query.trim()) {
    throw new AppError("Query parameter 'q' is required", 400);
  }

  const terms = queryTerms(query);
  if (terms.length === 0) {
    throw new AppError("Query parameter 'q' must contain searchable text", 400);
  }

  const documents = await prisma.knowledgeDocument.findMany({
    select: {
      docId: true,
      title: true,
      content: true,
    },
  });

  const results = documents
    .map((document) => ({
      docId: document.docId,
      title: document.title,
      relevanceScore: relevanceScore(document, terms),
      snippet: createSnippet(document.content, terms),
    }))
    .filter((document) => document.relevanceScore > 0)
    .sort(
      (left, right) =>
        right.relevanceScore - left.relevanceScore || left.docId.localeCompare(right.docId),
    );

  return {
    query: query.trim(),
    results,
  };
}

module.exports = {
  searchKnowledgeDocuments,
};
