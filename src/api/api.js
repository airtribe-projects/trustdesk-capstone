import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, // 45s timeout for AI generation tasks
});

// Helper for formatting API errors cleanly
const handleApiError = (error, defaultMsg) => {
  console.error(defaultMsg, error);
  if (error.response && error.response.data) {
    const detail = error.response.data.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map(d => d.msg || JSON.stringify(d)).join(', ');
    }
    if (error.response.data.message) return error.response.data.message;
  }
  return error.message || defaultMsg;
};

// ==========================================
// TICKET API ENDPOINTS
// ==========================================

export const fetchTickets = async () => {
  try {
    const response = await apiClient.get('/tickets');
    return response.data;
  } catch (err) {
    throw new Error(handleApiError(err, 'Failed to fetch tickets list'));
  }
};

export const fetchTicket = async (ticketId) => {
  try {
    const response = await apiClient.get(`/tickets/${ticketId}`);
    return response.data;
  } catch (err) {
    throw new Error(handleApiError(err, `Failed to fetch ticket ${ticketId}`));
  }
};

export const fetchTicketContext = async (ticketId) => {
  try {
    const response = await apiClient.get(`/tickets/${ticketId}/context`);
    return response.data;
  } catch (err) {
    throw new Error(handleApiError(err, `Failed to fetch context for ticket ${ticketId}`));
  }
};

// ==========================================
// CARD 1: AI TRIAGE
// ==========================================

export const runTriage = async (ticketId) => {
  try {
    // Primary router endpoint: /ai/tickets/{ticket_id}/triage
    try {
      const response = await apiClient.post(`/ai/tickets/${ticketId}/triage`);
      return response.data;
    } catch (firstErr) {
      // Fallback endpoint if mapped directly at root /triage/{ticketId}
      if (firstErr.response && firstErr.response.status === 404) {
        const fallbackRes = await apiClient.post(`/triage/${ticketId}`);
        return fallbackRes.data;
      }
      throw firstErr;
    }
  } catch (err) {
    throw new Error(handleApiError(err, 'Failed to execute AI Triage'));
  }
};

// ==========================================
// CARD 2: AI DRAFT REPLY & REVIEWS
// ==========================================

export const generateReply = async (ticketId) => {
  try {
    try {
      const response = await apiClient.post(`/reply/tickets/${ticketId}/reply`);
      return response.data;
    } catch (firstErr) {
      if (firstErr.response && firstErr.response.status === 404) {
        const fallbackRes = await apiClient.post(`/reply/${ticketId}`);
        return fallbackRes.data;
      }
      throw firstErr;
    }
  } catch (err) {
    throw new Error(handleApiError(err, 'Failed to generate AI Draft Reply'));
  }
};

export const approveReply = async (ticketId, approvedBy = 'Support Agent') => {
  try {
    const response = await apiClient.post(`/reply/${ticketId}/approve`, {
      approved_by: approvedBy,
    });
    return response.data;
  } catch (err) {
    throw new Error(handleApiError(err, 'Failed to approve draft reply'));
  }
};

export const rejectReply = async (ticketId, reviewComment = 'Needs refinement') => {
  try {
    const response = await apiClient.post(`/reply/${ticketId}/reject`, {
      review_comment: reviewComment,
    });
    return response.data;
  } catch (err) {
    throw new Error(handleApiError(err, 'Failed to reject draft reply'));
  }
};

export const getReply = async (ticketId) => {
  try {
    const response = await apiClient.get(`/reply/${ticketId}`);
    return response.data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return null;
    }
    throw new Error(handleApiError(err, 'Failed to fetch existing reply'));
  }
};

// ==========================================
// CARD 3: TOOL ACTIONS (REQUEST, APPROVE, EXECUTE)
// ==========================================

export const requestToolAction = async (ticketId, toolName) => {
  try {
    const response = await apiClient.post('/tool-actions/request', {
      ticket_id: ticketId,
      tool_name: toolName,
    });
    return response.data;
  } catch (err) {
    throw new Error(handleApiError(err, 'Failed to request tool action'));
  }
};

export const approveToolAction = async (executionId, approvedBy = 'Support Agent') => {
  try {
    const response = await apiClient.post(`/tool-actions/${executionId}/approve`, {
      approved_by: approvedBy,
    });
    return response.data;
  } catch (err) {
    throw new Error(handleApiError(err, 'Failed to approve tool action'));
  }
};

export const executeToolAction = async (executionId) => {
  try {
    const response = await apiClient.post(`/tool-actions/${executionId}/execute`);
    return response.data;
  } catch (err) {
    throw new Error(handleApiError(err, 'Failed to execute tool action'));
  }
};

// ==========================================
// CARD 4 & EVALUATION
// ==========================================

export const runEvaluation = async () => {
  try {
    const response = await apiClient.post('/eval-runs');
    return response.data;
  } catch (err) {
    throw new Error(handleApiError(err, 'Failed to run AI evaluation'));
  }
};

// ==========================================
// KNOWLEDGE SEARCH
// ==========================================

export const searchKnowledge = async (query) => {
  try {
    const response = await apiClient.get(`/knowledge/search`, {
      params: { q: query },
    });
    return response.data;
  } catch (err) {
    throw new Error(handleApiError(err, 'Knowledge search failed'));
  }
};

// ==========================================
// HEALTH CHECK
// ==========================================

export const checkHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (err) {
    return { status: 'offline', message: err.message };
  }
};

export default {
  API_BASE,
  fetchTickets,
  fetchTicket,
  fetchTicketContext,
  runTriage,
  generateReply,
  approveReply,
  rejectReply,
  getReply,
  requestToolAction,
  approveToolAction,
  executeToolAction,
  runEvaluation,
  searchKnowledge,
  checkHealth,
};
