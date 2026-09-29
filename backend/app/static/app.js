const tokenInput = document.querySelector("#api-token");
const notice = document.querySelector("#notice");
const queue = document.querySelector("#ticket-queue");
const selectedHeading = document.querySelector("#ticket-heading");
const details = document.querySelector("#ticket-details");
const triageOutput = document.querySelector("#triage-result");
const draftOutput = document.querySelector("#draft-result");
const actionOutput = document.querySelector("#action-result");
const evaluationOutput = document.querySelector("#evaluation-result");

let tickets = [];
let selectedTicket = null;
let selectedContext = null;
let currentDraft = null;
let currentAction = null;

function setNotice(message) {
  notice.textContent = message || "";
  notice.hidden = !message;
}

function authHeaders(json = false) {
  const token = tokenInput.value.trim();
  if (!token) {
    throw new Error("Enter the configured bearer token to connect.");
  }
  const headers = { Authorization: `Bearer ${token}` };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: { ...authHeaders(Boolean(options.body)), ...options.headers },
    });
  } catch (error) {
    throw new Error(`Could not reach the TrustDesk API: ${error.message}`);
  }
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    const detail = typeof body === "object" ? body.detail : body;
    throw new Error(detail || `Request failed with status ${response.status}.`);
  }
  return body;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function detailBlock(label, value, wide = false) {
  const block = element("div", `detail-block${wide ? " wide" : ""}`);
  block.append(element("span", "detail-label", label));
  block.append(element("div", "detail-value", value || "Not available"));
  return block;
}

function updateConnection(connected) {
  const status = document.querySelector("#connection-status");
  status.textContent = connected ? "Connected" : "Not connected";
  status.classList.toggle("connected", connected);
  document.querySelector("#run-evaluation").disabled = !connected;
}

async function loadTickets() {
  setNotice("");
  try {
    const response = await api("/tickets");
    tickets = response.items;
    document.querySelector("#ticket-count").textContent = String(response.total);
    queue.replaceChildren();
    if (!tickets.length) {
      queue.append(element("p", "empty-state", "No tickets are available."));
    }
    for (const ticket of tickets) {
      const button = element("button", "ticket-item");
      button.type = "button";
      button.dataset.ticketId = ticket.ticket_id;
      button.append(element("strong", "", ticket.subject));
      button.append(element("span", "", ticket.body));
      button.append(element("small", "", `${ticket.ticket_id} · ${ticket.status}`));
      button.addEventListener("click", () => selectTicket(ticket.ticket_id));
      queue.append(button);
    }
    updateConnection(true);
    if (tickets.length) await selectTicket(tickets[0].ticket_id);
  } catch (error) {
    updateConnection(false);
    setNotice(error.message);
  }
}

async function selectTicket(ticketId) {
  setNotice("");
  try {
    selectedContext = await api(`/tickets/${encodeURIComponent(ticketId)}/context`);
    selectedTicket = selectedContext.ticket;
    currentDraft = null;
    currentAction = null;
    document.querySelectorAll(".ticket-item").forEach((button) => {
      button.classList.toggle("selected", button.dataset.ticketId === ticketId);
    });
    selectedHeading.textContent = selectedTicket.subject;
    const statusTag = document.querySelector("#ticket-status");
    statusTag.textContent = selectedTicket.status;
    statusTag.hidden = false;
    details.className = "ticket-details";
    details.replaceChildren(
      detailBlock("Ticket", selectedTicket.ticket_id),
      detailBlock("Channel · Created", `${selectedTicket.channel} · ${new Date(selectedTicket.created_at).toLocaleString()}`),
      detailBlock("Customer", `${selectedContext.customer.name} · ${selectedContext.customer.tier} tier`),
      detailBlock("Order", selectedContext.order ? `${selectedContext.order.order_id} · ${selectedContext.order.status}` : "No linked order"),
      detailBlock("Customer message", selectedTicket.body, true),
      ...(selectedContext.order
        ? [detailBlock("Order items", selectedContext.order.items.map((item) => `${item.name} (${item.sku}) × ${item.quantity}`).join("\n"), true)]
        : []),
    );
    document.querySelector("#run-triage").disabled = false;
    document.querySelector("#generate-draft").disabled = false;
    triageOutput.replaceChildren();
    draftOutput.replaceChildren(element("p", "empty-state", "Generate a draft to see the response and its knowledge-base citations."));
    actionOutput.replaceChildren(element("p", "empty-state", "A supported sensitive recommendation will appear here after draft generation."));
  } catch (error) {
    setNotice(error.message);
  }
}

async function runTriage() {
  if (!selectedTicket) return;
  setNotice("");
  try {
    const result = await api(`/tickets/${encodeURIComponent(selectedTicket.ticket_id)}/triage`, { method: "POST" });
    const card = element("div", "result-card");
    const grid = element("div", "result-grid");
    for (const [label, value] of [
      ["Category", result.category],
      ["Priority", result.priority],
      ["Sentiment", result.sentiment],
      ["Escalation", result.should_escalate ? "Required" : "Not required"],
    ]) {
      const item = element("div", "");
      item.append(element("span", "detail-label", label));
      item.append(element("strong", "result-value", value));
      grid.append(item);
    }
    card.append(grid, element("p", "detail-value", result.triage_reason));
    card.append(element("span", "detail-label", `Trace ${result.run_id}`));
    triageOutput.replaceChildren(card);
  } catch (error) {
    setNotice(error.message);
  }
}

async function generateDraft() {
  if (!selectedTicket) return;
  setNotice("");
  try {
    currentDraft = await api(`/tickets/${encodeURIComponent(selectedTicket.ticket_id)}/draft-reply`, { method: "POST" });
    const card = element("div", "result-card");
    card.append(element("p", "draft-body", currentDraft.body));
    card.append(element("span", "detail-label", "Citations"));
    const citations = element("div", "citation-list");
    for (const citation of currentDraft.citations) citations.append(element("span", "citation", citation));
    if (!currentDraft.citations.length) citations.append(element("span", "detail-value", "No policy citations returned."));
    card.append(citations);
    card.append(element("span", "detail-label", `Trace ${currentDraft.run_id}`));
    const recommendationList = element("div", "citation-list");
    for (const action of currentDraft.recommended_actions) {
      recommendationList.append(element(
        "span",
        `tag${action.requires_human_approval ? " tag-amber" : ""}`,
        `${action.tool_name}${action.requires_human_approval ? " · approval required" : ""}`,
      ));
    }
    card.append(element("span", "detail-label", "Recommended actions"));
    card.append(recommendationList);
    draftOutput.replaceChildren(card);
    renderActionRecommendation();
  } catch (error) {
    setNotice(error.message);
  }
}

function renderActionRecommendation() {
  const replacement = currentDraft?.recommended_actions.find(
    (action) => action.tool_name === "create_replacement_order" && action.requires_human_approval,
  );
  if (!replacement) {
    actionOutput.replaceChildren(element("p", "empty-state", "No supported approval-gated replacement action was recommended for this draft. Recommendations are not executed automatically."));
    return;
  }
  const card = element("div", "result-card");
  card.append(element("p", "detail-value", replacement.reason));
  card.append(element("p", "detail-value", "This action is only requested for review. A human must explicitly approve it before execution."));
  const requestButton = element("button", "button button-secondary", "Request replacement for review");
  requestButton.type = "button";
  requestButton.addEventListener("click", requestReplacement);
  card.append(requestButton);
  actionOutput.replaceChildren(card);
}

async function requestReplacement() {
  const item = selectedContext?.order?.items?.find((orderItem) => !orderItem.final_sale);
  if (!selectedContext?.order || !item) {
    setNotice("A linked order with an eligible product is required for a replacement request.");
    return;
  }
  setNotice("");
  try {
    currentAction = await api("/tool-actions", {
      method: "POST",
      body: JSON.stringify({
        ticket_id: selectedTicket.ticket_id,
        tool_name: "create_replacement_order",
        payload: {
          order_id: selectedContext.order.order_id,
          sku: item.sku,
          reason: currentDraft.recommended_actions.find((action) => action.tool_name === "create_replacement_order").reason,
          idempotency_key: `${selectedTicket.ticket_id}-replacement-${crypto.randomUUID()}`,
        },
      }),
    });
    await refreshAction();
  } catch (error) {
    setNotice(error.message);
  }
}

async function refreshAction() {
  if (!currentAction) return;
  currentAction = await api(`/tool-actions/${encodeURIComponent(currentAction.action_id)}`);
  renderActionReview();
}

function renderActionReview() {
  const card = element("div", "result-card");
  card.append(element("div", "result-grid"));
  const summary = card.firstChild;
  for (const [label, value] of [
    ["Action", currentAction.tool_name],
    ["Status", currentAction.status],
    ["Risk", currentAction.risk_level],
    ["Approval", currentAction.requires_human_approval ? "Required" : "Not required"],
  ]) {
    const item = element("div", "");
    item.append(element("span", "detail-label", label), element("strong", "result-value", value));
    summary.append(item);
  }
  card.append(element("p", "detail-value", `Action ID: ${currentAction.action_id}`));

  if (currentAction.status === "approval_required") {
    const form = element("div", "action-form");
    const reviewerLabel = element("label", "");
    reviewerLabel.append(document.createTextNode("Reviewer ID"));
    const reviewer = element("input", "");
    reviewer.autocomplete = "off";
    reviewer.placeholder = "Human reviewer identifier";
    reviewerLabel.append(reviewer);
    const reasonLabel = element("label", "wide");
    reasonLabel.append(document.createTextNode("Decision reason"));
    const reason = element("textarea", "");
    reason.placeholder = "Record why you approve or reject this action";
    reasonLabel.append(reason);
    form.append(reviewerLabel, reasonLabel);
    const buttons = element("div", "inline-actions");
    const approve = element("button", "button button-success", "Approve");
    const reject = element("button", "button button-danger", "Reject");
    approve.type = reject.type = "button";
    approve.addEventListener("click", () => decideAction("approve", reviewer.value, reason.value));
    reject.addEventListener("click", () => decideAction("reject", reviewer.value, reason.value));
    buttons.append(approve, reject);
    card.append(form, buttons);
  } else if (currentAction.status === "approved") {
    const execute = element("button", "button button-primary", "Execute approved action");
    execute.type = "button";
    execute.addEventListener("click", executeAction);
    card.append(execute);
  } else if (currentAction.status === "executed") {
    card.append(element("p", "safe-text", "Execution completed."));
    card.append(element("pre", "detail-value", JSON.stringify(currentAction.execution_result, null, 2)));
  } else {
    card.append(element("p", currentAction.status === "rejected" ? "unsafe-text" : "detail-value",
      currentAction.status === "rejected" ? "Rejected; execution is blocked." : `Current action status: ${currentAction.status}`));
  }
  actionOutput.replaceChildren(card);
}

async function decideAction(decision, reviewerId, reason) {
  if (!reviewerId.trim() || !reason.trim()) {
    setNotice("Enter a reviewer ID and decision reason before recording approval or rejection.");
    return;
  }
  setNotice("");
  try {
    currentAction = await api(`/tool-actions/${encodeURIComponent(currentAction.action_id)}/${decision}`, {
      method: "POST",
      body: JSON.stringify({ reviewer_id: reviewerId.trim(), reason: reason.trim() }),
    });
    renderActionReview();
  } catch (error) {
    setNotice(error.message);
  }
}

async function executeAction() {
  setNotice("");
  try {
    currentAction = await api(`/tool-actions/${encodeURIComponent(currentAction.action_id)}/execute`, { method: "POST" });
    renderActionReview();
  } catch (error) {
    setNotice(error.message);
  }
}

function renderEvaluation(run) {
  const container = element("div", "");
  container.append(element("p", "detail-value", `${run.total_cases} case(s) · Run ${run.eval_run_id}`));
  const metrics = element("div", "metrics-grid");
  for (const [key, value] of Object.entries(run.metrics)) {
    const metric = element("div", "metric");
    metric.append(element("span", "", key.replaceAll("_", " ")));
    metric.append(element("strong", "", value === null ? "Not evaluated" : `${(value * 100).toFixed(1)}%`));
    metrics.append(metric);
  }
  container.append(metrics);
  const tableWrap = element("div", "eval-table-wrap");
  const table = element("table", "eval-table");
  const head = element("thead", "");
  const headerRow = element("tr", "");
  for (const label of ["Case", "Ticket", "Category", "Priority", "Citations", "Actions", "Escalation", "Safety"]) {
    headerRow.append(element("th", "", label));
  }
  head.append(headerRow);
  table.append(head);
  const body = element("tbody", "");
  for (const result of run.case_results) {
    const row = element("tr", "");
    const safe = result.blocked_actions.length === result.disallowed_actions.length;
    const values = [
      result.case_id,
      result.ticket_id,
      result.predicted_category,
      result.predicted_priority,
      result.citations.join(", ") || "None",
      result.recommended_actions.join(", ") || "None",
      result.should_escalate ? "Escalate" : "No",
      safe ? "Disallowed actions blocked" : `Unsafe: ${result.disallowed_actions.filter((action) => !result.blocked_actions.includes(action)).join(", ")}`,
    ];
    values.forEach((value, index) => row.append(element("td", index === 7 ? (safe ? "safe-text" : "unsafe-text") : "", value)));
    body.append(row);
  }
  table.append(body);
  tableWrap.append(table);
  container.append(tableWrap);
  evaluationOutput.replaceChildren(container);
}

async function runEvaluation() {
  setNotice("");
  try {
    const run = await api("/eval-runs", { method: "POST" });
    renderEvaluation(run);
  } catch (error) {
    setNotice(error.message);
  }
}

document.querySelector("#load-tickets").addEventListener("click", loadTickets);
document.querySelector("#run-triage").addEventListener("click", runTriage);
document.querySelector("#generate-draft").addEventListener("click", generateDraft);
document.querySelector("#run-evaluation").addEventListener("click", runEvaluation);
tokenInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadTickets();
});
