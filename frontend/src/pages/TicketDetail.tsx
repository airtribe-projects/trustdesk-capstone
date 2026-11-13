import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Ticket, TriageResult, DraftReply, KnowledgeResult, ActionResponse, AgentTrace } from '../types';

interface Props { ticketId: string; onBack: () => void; }

export default function TicketDetail({ ticketId, onBack }: Props) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [draft, setDraft] = useState<DraftReply | null>(null);
  const [kbResults, setKbResults] = useState<KnowledgeResult[]>([]);
  const [actions, setActions] = useState<ActionResponse[]>([]);
  const [traces, setTraces] = useState<AgentTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [triaging, setTriaging] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getTicket(ticketId).then(t => { setTicket(t); return t; })
      .then(t => { if (t.triageCategory) setTriage({ ticketId: t.ticketId, category: t.triageCategory!, priority: t.triagePriority!, sentiment: t.triageSentiment!, shouldEscalate: t.triageEscalation!, reasonSummary: t.triageReason!, runId: '' }); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
    api.getTraces(ticketId).then(setTraces).catch(() => {});
  }, [ticketId]);

  const handleTriage = async () => {
    setTriaging(true); setError('');
    try {
      const result = await api.triageTicket(ticketId);
      setTriage(result);
      const updated = await api.getTicket(ticketId);
      setTicket(updated);
      api.getTraces(ticketId).then(setTraces);
    } catch (e: any) { setError(e.message); } finally { setTriaging(false); }
  };

  const handleDraft = async () => {
    setDrafting(true); setError('');
    try {
      const result = await api.generateDraft(ticketId);
      setDraft(result);
      if (ticket) { const q = ticket.subject + ' ' + ticket.body.substring(0, 100); api.searchKnowledge(q).then(r => setKbResults(r.results)).catch(() => {}); }
      api.getTraces(ticketId).then(setTraces);
    } catch (e: any) { setError(e.message); } finally { setDrafting(false); }
  };

  const handleRequestAction = async (toolName: string, reason: string) => {
    if (!ticket) return;
    const payload: Record<string, unknown> = { reason, idempotency_key: `${ticketId}-${toolName}-${Date.now()}` };
    if (ticket.orderId) payload.order_id = ticket.orderId;
    if (toolName === 'create_replacement_order' && ticket.order?.items?.[0]) payload.sku = ticket.order.items[0].sku;
    if (toolName === 'start_refund_review' && ticket.order) payload.amount = ticket.order.total;
    try {
      const action = await api.requestAction(ticketId, toolName, payload);
      setActions(prev => [...prev, action]);
    } catch (e: any) { setError(e.message); }
  };

  const handleApprove = async (actionId: string) => {
    try {
      const updated = await api.approveAction(actionId, 'support_manager', 'Approved after review');
      setActions(prev => prev.map(a => a.actionId === actionId ? updated : a));
    } catch (e: any) { setError(e.message); }
  };

  const handleReject = async (actionId: string) => {
    try {
      const updated = await api.rejectAction(actionId, 'support_manager', 'Rejected after review');
      setActions(prev => prev.map(a => a.actionId === actionId ? updated : a));
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return <div className="loading">Loading ticket...</div>;
  if (!ticket) return <div className="error">Ticket not found</div>;

  return (
    <div className="ticket-detail">
      <button className="back-btn" onClick={onBack}>← Back to Tickets</button>
      {error && <div className="error">{error}</div>}

      <div className="detail-grid">
        {/* Ticket Info */}
        <section className="panel">
          <h2>{ticket.subject}</h2>
          <div className="ticket-info-grid">
            <div><strong>ID:</strong> {ticket.ticketId}</div>
            <div><strong>Channel:</strong> {ticket.channel}</div>
            <div><strong>Status:</strong> {ticket.status}</div>
            <div><strong>Created:</strong> {new Date(ticket.createdAt).toLocaleString()}</div>
          </div>
          <div className="ticket-body-full"><strong>Message:</strong><p>{ticket.body}</p></div>
        </section>

        {/* Customer Info */}
        {ticket.customer && (
          <section className="panel">
            <h3>Customer</h3>
            <div className="info-grid">
              <div><strong>Name:</strong> {ticket.customer.name}</div>
              <div><strong>Email:</strong> {ticket.customer.email}</div>
              <div><strong>Tier:</strong> <span className={`tier-badge ${ticket.customer.tier}`}>{ticket.customer.tier}</span></div>
              <div><strong>Verified:</strong> {ticket.customer.verified ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Country:</strong> {ticket.customer.country}</div>
            </div>
          </section>
        )}

        {/* Order Info */}
        {ticket.order && (
          <section className="panel">
            <h3>Order</h3>
            <div className="info-grid">
              <div><strong>Order ID:</strong> {ticket.order.orderId}</div>
              <div><strong>Status:</strong> {ticket.order.status}</div>
              <div><strong>Total:</strong> {ticket.order.currency} {ticket.order.total}</div>
              <div><strong>Placed:</strong> {ticket.order.placedAt}</div>
              <div><strong>Delivered:</strong> {ticket.order.deliveredAt || 'N/A'}</div>
              <div><strong>Return Until:</strong> {ticket.order.eligibleReturnUntil || 'N/A'}</div>
              <div><strong>Tracking:</strong> {ticket.order.trackingNumber}</div>
            </div>
            {ticket.order.items && (
              <div className="order-items">
                <strong>Items:</strong>
                {ticket.order.items.map((item, i) => (
                  <div key={i} className="order-item">{item.name} ({item.sku}) x{item.quantity} {item.final_sale ? '⚠️ Final Sale' : ''}</div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* AI Triage */}
        <section className="panel">
          <h3>AI Triage</h3>
          {!triage ? (
            <button className="action-btn primary" onClick={handleTriage} disabled={triaging}>
              {triaging ? 'Triaging...' : 'Run Triage'}
            </button>
          ) : (
            <div className="triage-results">
              <div className="triage-grid">
                <div className="triage-item"><label>Category</label><span className="badge category">{triage.category}</span></div>
                <div className="triage-item"><label>Priority</label><span className={`badge priority-${triage.priority}`}>{triage.priority}</span></div>
                <div className="triage-item"><label>Sentiment</label><span className="badge">{triage.sentiment}</span></div>
                <div className="triage-item"><label>Escalate</label><span className={`badge ${triage.shouldEscalate ? 'escalation' : 'safe'}`}>{triage.shouldEscalate ? '⚠️ Yes' : '✅ No'}</span></div>
              </div>
              <div className="triage-reason"><strong>Reason:</strong> {triage.reasonSummary}</div>
              <button className="action-btn secondary" onClick={handleTriage} disabled={triaging}>Re-run Triage</button>
            </div>
          )}
        </section>

        {/* Draft Reply */}
        <section className="panel">
          <h3>Draft Reply</h3>
          <button className="action-btn primary" onClick={handleDraft} disabled={drafting}>
            {drafting ? 'Generating...' : draft ? 'Regenerate Draft' : 'Generate Draft'}
          </button>
          {draft && (
            <div className="draft-reply">
              <div className="draft-body"><pre>{draft.body}</pre></div>
              {draft.citations.length > 0 && (
                <div className="citations"><strong>Citations:</strong> {draft.citations.map(c => <span key={c} className="citation-badge">{c}</span>)}</div>
              )}
              {draft.recommendedActions && draft.recommendedActions.length > 0 && (
                <div className="recommended-actions">
                  <strong>Recommended Actions:</strong>
                  {draft.recommendedActions.map((a, i) => (
                    <div key={i} className="action-card">
                      <span className="tool-name">{a.tool_name}</span>
                      {a.requires_human_approval && <span className="badge approval">Needs Approval</span>}
                      <p>{a.reason}</p>
                      <button className="action-btn small" onClick={() => handleRequestAction(a.tool_name, a.reason)}>
                        Request Action
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* KB Results */}
        {kbResults.length > 0 && (
          <section className="panel">
            <h3>Knowledge Base Results</h3>
            {kbResults.map(r => (
              <div key={r.docId} className="kb-result">
                <div className="kb-header"><span className="citation-badge">{r.docId}</span> <strong>{r.title}</strong> <span className="score">Score: {r.score.toFixed(2)}</span></div>
                <p className="kb-snippet">{r.snippet}</p>
              </div>
            ))}
          </section>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <section className="panel">
            <h3>Tool Actions</h3>
            {actions.map(a => (
              <div key={a.actionId} className={`action-status-card ${a.status}`}>
                <div className="action-header">
                  <strong>{a.toolName}</strong>
                  <span className={`badge status-${a.status}`}>{a.status}</span>
                </div>
                {a.executionResult && <p className="execution-result">{a.executionResult}</p>}
                {a.status === 'approval_required' && (
                  <div className="approval-controls">
                    <button className="action-btn approve" onClick={() => handleApprove(a.actionId)}>✅ Approve</button>
                    <button className="action-btn reject" onClick={() => handleReject(a.actionId)}>❌ Reject</button>
                  </div>
                )}
                {a.reviewerId && <div className="review-info">Reviewed by: {a.reviewerId} — {a.reviewReason}</div>}
              </div>
            ))}
          </section>
        )}

        {/* Traces */}
        {traces.length > 0 && (
          <section className="panel">
            <h3>AI Traces</h3>
            {traces.map(t => (
              <div key={t.runId} className="trace-card">
                <div className="trace-header"><span className="badge">{t.runType}</span> <span className={`badge status-${t.status}`}>{t.status}</span></div>
                <div className="trace-details">
                  <div><strong>Run ID:</strong> {t.runId}</div>
                  {t.retrievedDocIds && <div><strong>Docs:</strong> {t.retrievedDocIds}</div>}
                  {t.guardrailResults && <div><strong>Guardrails:</strong> {t.guardrailResults}</div>}
                  <div><strong>Time:</strong> {new Date(t.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
