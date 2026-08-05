import { useEffect, useState } from "react";

import EvaluationPage from "./EvaluationPage";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || "We could not complete that request. Please try again.");
  }

  return payload;
}

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function titleCase(value = "") {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function productName(order) {
  if (!order?.items) return "No linked order";

  try {
    const [item] = JSON.parse(order.items);
    return item?.name || "Order details available";
  } catch {
    return "Order details available";
  }
}

function firstOrderItem(order) {
  if (!order?.items) return null;

  try {
    return JSON.parse(order.items)[0] || null;
  } catch {
    return null;
  }
}

function StatusDot({ status }) {
  const color = status === "pending" ? "bg-amber-400" : "bg-violet-500";
  return <span className={`h-2 w-2 rounded-full ${color}`} />;
}

function App() {
  const [activeView, setActiveView] = useState("tickets");
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [replyComposerOpen, setReplyComposerOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toolActions, setToolActions] = useState([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionUpdating, setActionUpdating] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (selectedTicketId) {
      loadToolActions(selectedTicketId);
    }
  }, [selectedTicketId]);

  async function loadTickets() {
    setTicketsLoading(true);
    setTicketsError("");

    try {
      const data = await apiRequest("/tickets");
      setTickets(data);
      setSelectedTicketId((currentId) => currentId || data[0]?.ticketId || null);
    } catch (error) {
      setTicketsError(error.message);
    } finally {
      setTicketsLoading(false);
    }
  }

  function selectTicket(ticketId) {
    setSelectedTicketId(ticketId);
    setAnalysis(null);
    setAnalysisError("");
    setReplyComposerOpen(false);
    setReplyBody("");
    setShowSuccessToast(false);
    setToolActions([]);
    setActionError("");
  }

  async function loadToolActions(ticketId) {
    setActionsLoading(true);
    setActionError("");

    try {
      const actions = await apiRequest(`/tickets/${ticketId}/tool-actions`);
      setToolActions(actions);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActionsLoading(false);
    }
  }

  async function runAnalysis() {
    if (!selectedTicketId) return;

    setAnalysisLoading(true);
    setAnalysisError("");

    try {
      const data = await apiRequest(`/tickets/${selectedTicketId}/analyze`, {
        method: "POST",
      });
      setAnalysis(data);
    } catch (error) {
      setAnalysisError(error.message);
    } finally {
      setAnalysisLoading(false);
    }
  }

  function openReplyComposer() {
    if (!analysis?.draft?.reply) return;

    setReplyBody(analysis.draft.reply);
    setReplyComposerOpen(true);
    setShowSuccessToast(false);
  }

  function cancelReply() {
    if (sendingReply) return;

    setReplyComposerOpen(false);
    setReplyBody("");
  }

  async function sendReply() {
    if (!replyBody.trim() || sendingReply) return;

    setSendingReply(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setSendingReply(false);
    setReplyComposerOpen(false);
    setReplyBody("");
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  }

  async function requestReplacement() {
    const item = firstOrderItem(selectedTicket?.order);
    if (!selectedTicket || !item) return;

    setActionUpdating(true);
    setActionError("");
    try {
      const result = await apiRequest(`/tickets/${selectedTicket.ticketId}/tool-actions/replacement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: item.sku,
          reason: "Damaged item reported by customer",
          idempotencyKey: `replacement:${selectedTicket.ticketId}:${item.sku}`,
        }),
      });
      setToolActions((actions) => [
        result.action,
        ...actions.filter((action) => action.actionId !== result.action.actionId),
      ]);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActionUpdating(false);
    }
  }

  async function decideToolAction(actionId, decision) {
    setActionUpdating(true);
    setActionError("");
    try {
      const action = await apiRequest(`/tool-actions/${actionId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerId: "support_manager_demo",
          decision,
          reason: decision === "approved" ? "Approved for replacement" : "Not approved for replacement",
        }),
      });
      setToolActions((actions) => actions.map((current) => current.actionId === action.actionId ? action : current));
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActionUpdating(false);
    }
  }

  async function executeToolAction(actionId) {
    setActionUpdating(true);
    setActionError("");
    try {
      const action = await apiRequest(`/tool-actions/${actionId}/execute`, { method: "POST" });
      setToolActions((actions) => actions.map((current) => current.actionId === action.actionId ? action : current));
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActionUpdating(false);
    }
  }

  const selectedTicket = tickets.find((ticket) => ticket.ticketId === selectedTicketId);
  const classification = analysis?.ticket?.ticketId === selectedTicketId ? analysis.classification : null;
  const hasAnalysis = analysis?.ticket?.ticketId === selectedTicketId;
  const replacementAction = toolActions.find((action) => action.toolName === "create_replacement_order");
  const canRequestReplacement = hasAnalysis && ["refund", "warranty"].includes(classification?.category) && Boolean(firstOrderItem(selectedTicket?.order));

  return (
    <main className="min-h-screen bg-[#f7f7f8] p-3 text-slate-900 lg:p-5">
      <section className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1760px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_50px_-28px_rgba(15,23,42,0.35)] lg:grid-cols-[280px_minmax(0,1fr)_340px] lg:min-h-[calc(100vh-2.5rem)]">
        <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50/60 lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between px-5 pb-5 pt-6">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white shadow-sm">T</div>
              <div>
                <p className="text-[15px] font-semibold tracking-tight">TrustDesk</p>
                <p className="text-xs text-slate-500">Support operations</p>
              </div>
            </div>
            <button className="grid h-8 w-8 place-items-center rounded-lg text-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-900" aria-label="More options">...</button>
          </div>

          <div className="space-y-1 px-3 pb-5">
            <button type="button" onClick={() => setActiveView("tickets")} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${activeView === "tickets" ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-white/80"}`}>
              <span>Tickets</span>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">{tickets.length}</span>
            </button>
            <button type="button" onClick={() => setActiveView("evaluation")} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${activeView === "evaluation" ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-white/80"}`}>
              <span>Evaluation</span>
              <span className="text-xs text-slate-400">Overview</span>
            </button>
          </div>

          {activeView === "tickets" && <nav className="flex min-h-0 flex-1 gap-1 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-y-auto">
            {ticketsLoading && <p className="px-3 py-4 text-xs text-slate-500">Loading tickets...</p>}
            {ticketsError && (
              <div className="m-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <p>{ticketsError}</p>
                <button type="button" onClick={loadTickets} className="mt-2 font-semibold underline">Try again</button>
              </div>
            )}
            {!ticketsLoading && !ticketsError && tickets.map((ticket) => {
              const isSelected = ticket.ticketId === selectedTicketId;
              return (
                <button
                  key={ticket.ticketId}
                  type="button"
                  onClick={() => selectTicket(ticket.ticketId)}
                  className={`min-w-[238px] rounded-xl p-3 text-left transition lg:min-w-0 ${isSelected ? "bg-white shadow-sm ring-1 ring-slate-200" : "hover:bg-white/80"}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">{initials(ticket.customer?.name)}</span>
                      <span className="truncate text-xs font-semibold text-slate-700">{ticket.customer?.name || "Unknown customer"}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{formatDate(ticket.createdAt)}</span>
                  </div>
                  <p className="truncate text-sm font-semibold tracking-tight">{ticket.subject}</p>
                  <p className="mt-1 truncate text-xs leading-5 text-slate-500">{ticket.body}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                    <StatusDot status={ticket.status} />
                    <span>{titleCase(ticket.status)}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span>{ticket.channel}</span>
                  </div>
                </button>
              );
            })}
          </nav>}
        </aside>

        {activeView === "evaluation" ? <EvaluationPage request={apiRequest} /> : <>
        <section className="min-w-0 border-b border-slate-200 lg:border-r lg:border-b-0">
          {selectedTicket ? (
            <>
              <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>Tickets</span><span className="text-slate-300">/</span><span className="font-medium text-slate-700">{selectedTicket.ticketId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-950">Assign</button>
                  <button type="button" disabled={!hasAnalysis || analysisLoading} onClick={openReplyComposer} className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">Reply</button>
                </div>
              </header>

              <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
                <div className="mb-7 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700"><StatusDot status={selectedTicket.status} />{titleCase(selectedTicket.status)}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{selectedTicket.channel}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{classification?.priority ? `${titleCase(classification.priority)} priority` : "Awaiting analysis"}</span>
                </div>

                <h1 className="max-w-2xl text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">{selectedTicket.subject}</h1>
                <p className="mt-3 text-sm text-slate-500">Received {formatDate(selectedTicket.createdAt)} &middot; Ticket {selectedTicket.ticketId}</p>

                <article className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">{initials(selectedTicket.customer?.name)}</span>
                    <div>
                      <p className="text-sm font-semibold">{selectedTicket.customer?.name || "Unknown customer"}</p>
                      <p className="text-xs text-slate-500">{selectedTicket.customer?.email || "No email available"}</p>
                    </div>
                  </div>
                  <p className="max-w-2xl text-[15px] leading-7 text-slate-700">{selectedTicket.body}</p>
                </article>

                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <InfoCard label="Customer" value={selectedTicket.customer?.name || "Unknown customer"} detail={`${titleCase(selectedTicket.customer?.tier || "standard")} tier · ${selectedTicket.customer?.verified ? "Verified" : "Unverified"}`} />
                  <InfoCard label="Order" value={selectedTicket.order ? `#${selectedTicket.order.orderId}` : "No linked order"} detail={productName(selectedTicket.order)} />
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-full place-items-center p-8 text-center">
              <div><p className="text-sm font-semibold">Select a ticket</p><p className="mt-1 text-xs text-slate-500">Choose a ticket from the inbox to view its details.</p></div>
            </div>
          )}
        </section>

        <aside className="bg-slate-50/60 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-600 text-xs font-bold text-white">✦</span>
            <div><p className="text-sm font-semibold">AI Analysis</p><p className="text-xs text-slate-500">Grounded support assistant</p></div>
          </div>

          {analysisError ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <p className="text-sm font-semibold text-rose-800">Analysis could not be completed</p>
              <p className="mt-2 text-xs leading-5 text-rose-700">{analysisError}</p>
              <button type="button" onClick={runAnalysis} className="mt-4 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-800">Retry</button>
            </div>
          ) : analysis ? (
            <AnalysisResult
              analysis={analysis}
              replyComposerOpen={replyComposerOpen}
              replyBody={replyBody}
              sendingReply={sendingReply}
              onReplyBodyChange={setReplyBody}
              onCancelReply={cancelReply}
              onSendReply={sendReply}
              replacementAction={replacementAction}
              canRequestReplacement={canRequestReplacement}
              actionsLoading={actionsLoading}
              actionUpdating={actionUpdating}
              actionError={actionError}
              onRequestReplacement={requestReplacement}
              onDecideAction={decideToolAction}
              onExecuteAction={executeToolAction}
            />
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center">
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-xl text-violet-600">✦</div>
              <h2 className="mt-4 text-sm font-semibold text-slate-800">Analysis is ready when you are</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">Run analysis to see issue classification, policy context, and a grounded draft reply.</p>
              <button type="button" disabled={!selectedTicket || analysisLoading} onClick={runAnalysis} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                {analysisLoading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" />}
                {analysisLoading ? "Analyzing..." : "Run AI analysis"}
              </button>
            </div>
          )}

          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Workflow</p>
            <div className="mt-4 space-y-3">
              <WorkflowItem step="1" label="Review ticket context" active />
              <WorkflowItem step="2" label="Run AI analysis" active={Boolean(analysis)} />
              <WorkflowItem step="3" label="Review draft response" active={Boolean(analysis)} />
            </div>
          </div>
        </aside>
        </>}
      </section>
      {showSuccessToast && (
        <div role="status" className="fixed bottom-6 right-6 z-10 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-xs">✓</span>
          Reply sent successfully.
        </div>
      )}
    </main>
  );
}

function AnalysisResult({
  analysis,
  replyComposerOpen,
  replyBody,
  sendingReply,
  onReplyBodyChange,
  onCancelReply,
  onSendReply,
  replacementAction,
  canRequestReplacement,
  actionsLoading,
  actionUpdating,
  actionError,
  onRequestReplacement,
  onDecideAction,
  onExecuteAction,
}) {
  const { classification, draft } = analysis;
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Classification</p>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <AnalysisField label="Category" value={titleCase(classification.category)} />
          <AnalysisField label="Priority" value={titleCase(classification.priority)} />
          <AnalysisField label="Sentiment" value={titleCase(classification.sentiment)} />
          <AnalysisField label="Escalation" value={classification.escalation ? "Required" : "Not required"} />
        </dl>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Draft reply</p>
        <p className="mt-3 text-sm leading-6 text-slate-700">{draft.reply}</p>
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-medium text-slate-500">Citations</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.citations.length ? draft.citations.map((citation) => <span key={citation} className="rounded-md bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700">{citation}</span>) : <span className="text-xs text-slate-400">No citations returned.</span>}
          </div>
        </div>
      </div>

      {replyComposerOpen && (
        <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Reply composer</p>
            <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">Editable draft</span>
          </div>
          <textarea
            value={replyBody}
            onChange={(event) => onReplyBodyChange(event.target.value)}
            disabled={sendingReply}
            rows={7}
            className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-3 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="Reply message"
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <button type="button" disabled={sendingReply} onClick={onCancelReply} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
            <button type="button" disabled={!replyBody.trim() || sendingReply} onClick={onSendReply} className="flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {sendingReply && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" />}
              {sendingReply ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </div>
      )}

      {canRequestReplacement && (
        <ToolActionPanel
          action={replacementAction}
          loading={actionsLoading || actionUpdating}
          error={actionError}
          onRequest={onRequestReplacement}
          onDecide={onDecideAction}
          onExecute={onExecuteAction}
        />
      )}
    </div>
  );
}

function ToolActionPanel({ action, loading, error, onRequest, onDecide, onExecute }) {
  const statusLabels = {
    approval_required: "Approval required",
    approved: "Approved",
    rejected: "Rejected",
    executed: "Replacement created",
  };
  const statusStyles = {
    approval_required: "bg-amber-50 text-amber-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-rose-50 text-rose-700",
    executed: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Recommended action</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">Create replacement order</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">This medium-risk action always requires a human approval before execution.</p>
        </div>
        {action && <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyles[action.status] || "bg-slate-100 text-slate-600"}`}>{statusLabels[action.status] || titleCase(action.status)}</span>}
      </div>

      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      {!action && (
        <button type="button" disabled={loading} onClick={onRequest} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300">
          {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" />}
          {loading ? "Preparing action..." : "Request replacement"}
        </button>
      )}

      {action?.status === "approval_required" && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" disabled={loading} onClick={() => onDecide(action.actionId, "rejected")} className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">Reject</button>
          <button type="button" disabled={loading} onClick={() => onDecide(action.actionId, "approved")} className="flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">{loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" />}Approve</button>
        </div>
      )}

      {action?.status === "approved" && (
        <button type="button" disabled={loading} onClick={() => onExecute(action.actionId)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">{loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" />}Execute replacement</button>
      )}
    </div>
  );
}

function AnalysisField({ label, value }) {
  return <div><dt className="text-[11px] text-slate-500">{label}</dt><dd className="mt-1 text-xs font-semibold text-slate-800">{value}</dd></div>;
}

function InfoCard({ label, value, detail }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

function WorkflowItem({ step, label, active = false }) {
  return <div className="flex items-center gap-3"><span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold ${active ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-500"}`}>{step}</span><span className={`text-xs ${active ? "font-medium text-slate-800" : "text-slate-500"}`}>{label}</span></div>;
}

export default App;
