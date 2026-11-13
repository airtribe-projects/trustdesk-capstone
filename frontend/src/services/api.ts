const API_BASE = 'http://localhost:8080/api';
const AUTH_TOKEN = 'trustdesk-demo-token-2026';

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': AUTH_TOKEN,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

import type { Ticket, TriageResult, DraftReply, KnowledgeResult, ActionResponse, AgentTrace, EvalRun } from '../types';

export const api = {
  getTickets: () => fetchApi<Ticket[]>('/tickets'),
  getTicket: (id: string) => fetchApi<Ticket>(`/tickets/${id}`),
  triageTicket: (id: string) => fetchApi<TriageResult>(`/tickets/${id}/triage`, { method: 'POST' }),
  generateDraft: (id: string) => fetchApi<DraftReply>(`/tickets/${id}/draft-reply`, { method: 'POST' }),
  searchKnowledge: (q: string) => fetchApi<{ query: string; results: KnowledgeResult[] }>(`/knowledge/search?q=${encodeURIComponent(q)}`),
  getTraces: (ticketId: string) => fetchApi<AgentTrace[]>(`/tickets/${ticketId}/traces`),
  requestAction: (ticketId: string, toolName: string, payload: Record<string, unknown>) =>
    fetchApi<ActionResponse>(`/tickets/${ticketId}/actions`, { method: 'POST', body: JSON.stringify({ toolName, payload }) }),
  getAction: (actionId: string) => fetchApi<ActionResponse>(`/actions/${actionId}`),
  approveAction: (actionId: string, reviewerId?: string, reason?: string) =>
    fetchApi<ActionResponse>(`/actions/${actionId}/approve`, { method: 'POST', body: JSON.stringify({ reviewerId, reason }) }),
  rejectAction: (actionId: string, reviewerId?: string, reason?: string) =>
    fetchApi<ActionResponse>(`/actions/${actionId}/reject`, { method: 'POST', body: JSON.stringify({ reviewerId, reason }) }),
  runEvaluation: () => fetchApi<EvalRun>('/evaluations/run', { method: 'POST' }),
  getLatestEvaluation: () => fetchApi<EvalRun>('/evaluations/latest'),
};
