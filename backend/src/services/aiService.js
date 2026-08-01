const GeminiAIProvider = require("../adapters/GeminiAIProvider");
const AppError = require("../utils/AppError");
const knowledgeService = require("./knowledgeService");
const ticketService = require("./ticketService");

const VALID_CATEGORIES = new Set([
  "shipping",
  "refund",
  "warranty",
  "billing",
  "account_security",
  "general",
]);
const VALID_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);
const VALID_SENTIMENTS = new Set(["positive", "neutral", "negative"]);

function validateClassification(classification) {
  const isValid =
    classification &&
    VALID_CATEGORIES.has(classification.category) &&
    VALID_PRIORITIES.has(classification.priority) &&
    VALID_SENTIMENTS.has(classification.sentiment) &&
    typeof classification.escalation === "boolean";

  if (!isValid) {
    throw new AppError("Gemini returned an invalid classification response", 502);
  }
}

function validateDraft(draft, documents) {
  const allowedCitations = new Set(documents.map((document) => document.docId));
  const isValid =
    draft &&
    typeof draft.reply === "string" &&
    Array.isArray(draft.citations) &&
    draft.citations.every(
      (citation) => typeof citation === "string" && allowedCitations.has(citation),
    );

  if (!isValid) {
    throw new AppError("Gemini returned an invalid draft response", 502);
  }
}

function toAIServiceError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error.message?.includes("Gemini request timed out")) {
    return new AppError("Gemini request timed out", 504);
  }

  if (
    error.message?.includes("Gemini returned invalid JSON") ||
    error.message?.includes("Gemini returned an empty response") ||
    error.message?.includes("Gemini response must") ||
    error.message?.includes("Gemini returned a citation")
  ) {
    return new AppError("Gemini returned an invalid response", 502);
  }

  return new AppError("Gemini request failed", 502);
}

async function analyzeTicket(ticketId, aiProvider = new GeminiAIProvider()) {
  const ticket = await ticketService.getTicketById(ticketId);
  const retrievalQuery = `${ticket.subject} ${ticket.body}`;
  const documents = await knowledgeService.getRelevantKnowledgeDocuments(retrievalQuery);

  if (documents.length === 0) {
    throw new AppError("No relevant knowledge documents found for this ticket", 422);
  }

  try {
    const [classification, draft] = await Promise.all([
      aiProvider.classifyTicket(ticket, documents),
      aiProvider.generateDraft(ticket, documents),
    ]);

    validateClassification(classification);
    validateDraft(draft, documents);

    return {
      ticket,
      classification,
      draft,
      retrievedDocuments: documents.map(({ docId, title }) => ({ docId, title })),
    };
  } catch (error) {
    console.error(error);
    throw toAIServiceError(error);
  }
}

module.exports = {
  analyzeTicket,
};
