export interface Customer {
  customerId: string;
  name: string;
  email: string;
  tier: string;
  country: string;
  createdAt: string;
  verified: boolean;
  tags: string[];
}

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  category: string;
  final_sale: boolean;
}

export interface Order {
  orderId: string;
  customerId: string;
  status: string;
  placedAt: string;
  deliveredAt: string | null;
  eligibleReturnUntil: string | null;
  total: number;
  currency: string;
  paymentStatus: string;
  trackingNumber: string;
  items: OrderItem[];
}

export interface Ticket {
  ticketId: string;
  customerId: string;
  orderId: string;
  channel: string;
  subject: string;
  body: string;
  createdAt: string;
  status: string;
  triageCategory: string | null;
  triagePriority: string | null;
  triageSentiment: string | null;
  triageEscalation: boolean | null;
  triageReason: string | null;
  customer: Customer | null;
  order: Order | null;
}

export interface TriageResult {
  ticketId: string;
  category: string;
  priority: string;
  sentiment: string;
  shouldEscalate: boolean;
  reasonSummary: string;
  runId: string;
}

export interface RecommendedAction {
  tool_name: string;
  requires_human_approval: boolean;
  reason: string;
}

export interface DraftReply {
  draftId: string;
  ticketId: string;
  status: string;
  body: string;
  citations: string[];
  recommendedActions: RecommendedAction[];
  runId: string;
}

export interface KnowledgeResult {
  docId: string;
  title: string;
  snippet: string;
  score: number;
}

export interface ActionResponse {
  actionId: string;
  ticketId: string;
  toolName: string;
  status: string;
  idempotencyKey: string;
  requiresHumanApproval: boolean;
  executionResult: string | null;
  reviewerId: string | null;
  reviewReason: string | null;
  createdAt: string;
}

export interface AgentTrace {
  runId: string;
  ticketId: string;
  runType: string;
  status: string;
  retrievedDocIds: string;
  toolCalls: string;
  guardrailResults: string;
  createdAt: string;
}

export interface EvalCaseResult {
  case_id: string;
  ticket_id: string;
  predicted_category?: string;
  predicted_priority?: string;
  should_escalate?: boolean;
  category_match?: boolean;
  priority_match?: boolean;
  citation_covered?: boolean;
  unsafe_blocked?: boolean;
  escalation_match?: boolean;
  passed?: boolean;
  citations?: string[];
  recommended_actions?: string[];
  error?: string;
}

export interface EvalMetrics {
  total_cases: number;
  category_accuracy: number;
  priority_accuracy: number;
  citation_coverage: number;
  unsafe_action_block_rate: number;
  escalation_accuracy: number;
}

export interface EvalRun {
  eval_run_id: string;
  metrics: EvalMetrics;
  case_results: EvalCaseResult[];
  started_at?: string;
  completed_at?: string;
}
