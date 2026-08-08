import { prisma } from '../../config/db';
import { logger } from '../../utils/logger';

// Tool catalog from data/tool_actions.json
const TOOL_CATALOG: Record<string, { needsApproval: boolean; allowedCategories: string[]; riskLevel: string }> = {
  create_replacement_order: { needsApproval: true, allowedCategories: ['refund', 'warranty'], riskLevel: 'medium' },
  start_refund_review: { needsApproval: true, allowedCategories: ['refund', 'billing'], riskLevel: 'medium' },
  issue_coupon: { needsApproval: true, allowedCategories: ['shipping', 'general'], riskLevel: 'medium' },
  open_carrier_investigation: { needsApproval: false, allowedCategories: ['shipping'], riskLevel: 'low' },
  escalate_to_human: { needsApproval: false, allowedCategories: ['shipping', 'refund', 'warranty', 'billing', 'account_security', 'general'], riskLevel: 'low' },
  lock_account: { needsApproval: true, allowedCategories: ['account_security'], riskLevel: 'high' },
};

export interface ToolActionRequest {
  ticketId: string;
  toolName: string;
  params: Record<string, any>;
  idempotencyKey: string;
  requestedBy?: string;
}

export async function requestToolAction(req: ToolActionRequest) {
  const { ticketId, toolName, params, idempotencyKey } = req;

  // Validate tool exists
  const toolDef = TOOL_CATALOG[toolName];
  if (!toolDef) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  // Idempotency check
  const existing = await prisma.toolAction.findUnique({ where: { idempotencyKey } });
  if (existing) {
    logger.info(`Idempotent tool action found: ${idempotencyKey}`);
    return existing;
  }

  // Get ticket triage result for category check
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { triage: true },
  });
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

  const category = ticket.triage?.category || 'general';
  if (!toolDef.allowedCategories.includes(category) && toolDef.allowedCategories[0] !== 'all') {
    // Allow escalate_to_human for all categories
    if (toolName !== 'escalate_to_human') {
      logger.warn(`Tool ${toolName} not allowed for category ${category}`);
    }
  }

  // Create tool action (PENDING if needs approval, else execute directly)
  const status = toolDef.needsApproval ? 'PENDING' : 'EXECUTED';

  const toolAction = await prisma.toolAction.create({
    data: {
      ticketId,
      toolName,
      params: JSON.stringify(params),
      status,
      idempotencyKey,
      result: toolDef.needsApproval ? null : JSON.stringify({ message: `${toolName} executed`, params }),
    },
  });

  // Create approval record if needed
  if (toolDef.needsApproval) {
    await prisma.approval.create({
      data: {
        ticketId,
        toolName,
        approved: false,
      },
    });
  }

  return toolAction;
}

export async function executeToolAction(toolActionId: string, approvedBy: string) {
  const toolAction = await prisma.toolAction.findUnique({ where: { id: toolActionId } });
  if (!toolAction) throw new Error(`Tool action ${toolActionId} not found`);
  if (toolAction.status === 'EXECUTED') return toolAction;
  if (toolAction.status === 'REJECTED') throw new Error('Tool action was rejected');

  const result = {
    message: `${toolAction.toolName} executed successfully`,
    toolName: toolAction.toolName,
    params: JSON.parse(toolAction.params),
    executedBy: approvedBy,
    executedAt: new Date().toISOString(),
  };

  const updated = await prisma.toolAction.update({
    where: { id: toolActionId },
    data: {
      status: 'EXECUTED',
      result: JSON.stringify(result),
    },
  });

  // Update approval record
  await prisma.approval.updateMany({
    where: { ticketId: toolAction.ticketId, toolName: toolAction.toolName, approved: false },
    data: { approved: true, approvedBy, approvedAt: new Date() },
  });

  return updated;
}

export async function rejectToolAction(toolActionId: string, rejectedBy: string) {
  const toolAction = await prisma.toolAction.findUnique({ where: { id: toolActionId } });
  if (!toolAction) throw new Error(`Tool action ${toolActionId} not found`);
  if (toolAction.status !== 'PENDING') throw new Error(`Tool action is not pending (status: ${toolAction.status})`);

  const updated = await prisma.toolAction.update({
    where: { id: toolActionId },
    data: {
      status: 'REJECTED',
      result: JSON.stringify({ message: 'Rejected by human reviewer', rejectedBy }),
    },
  });

  await prisma.approval.updateMany({
    where: { ticketId: toolAction.ticketId, toolName: toolAction.toolName, approved: false },
    data: { approved: false, approvedBy: rejectedBy, approvedAt: new Date() },
  });

  return updated;
}

export function getToolCatalog() {
  return Object.entries(TOOL_CATALOG).map(([name, def]) => ({ name, ...def }));
}
