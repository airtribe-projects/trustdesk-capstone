const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const REPLACEMENT_TOOL = "create_replacement_order";
const ACTION_INCLUDE = {
  approval: true,
  ticket: {
    include: {
      customer: true,
      order: true,
    },
  },
};

function parseItems(order) {
  try {
    return JSON.parse(order.items);
  } catch {
    throw new AppError("The linked order has invalid item data", 422);
  }
}

function isDamageReport(ticket) {
  return /damaged|damage|cracked|defect|defective|broken/i.test(
    `${ticket.subject} ${ticket.body}`,
  );
}

async function getOperationalAction(actionId) {
  const action = await prisma.toolAction.findUnique({
    where: { actionId },
    include: ACTION_INCLUDE,
  });

  if (!action || action.status === "catalog") {
    throw new AppError("Tool action not found", 404);
  }

  return action;
}

async function listTicketActions(ticketId) {
  return prisma.toolAction.findMany({
    where: {
      ticketId,
      status: { not: "catalog" },
    },
    include: { approval: true },
    orderBy: { createdAt: "desc" },
  });
}

async function requestReplacement(ticketId, payload) {
  const { sku, reason, idempotencyKey } = payload || {};
  if (!sku || !reason || !idempotencyKey) {
    throw new AppError("sku, reason, and idempotencyKey are required", 400);
  }

  const ticket = await prisma.ticket.findUnique({
    where: { ticketId },
    include: { order: true },
  });
  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }
  if (!ticket.order) {
    throw new AppError("A replacement requires a linked order", 422);
  }
  if (!isDamageReport(ticket)) {
    throw new AppError("A replacement can only be requested for a reported damaged or defective item", 422);
  }
  if (ticket.order.status !== "delivered") {
    throw new AppError("A replacement requires a delivered order", 422);
  }
  if (
    ticket.order.eligibleReturnUntil &&
    ticket.createdAt > ticket.order.eligibleReturnUntil
  ) {
    throw new AppError("The replacement request is outside the return window", 422);
  }

  const item = parseItems(ticket.order).find((orderItem) => orderItem.sku === sku);
  if (!item || item.final_sale) {
    throw new AppError("The selected item is not eligible for replacement", 422);
  }

  const existingAction = await prisma.toolAction.findUnique({
    where: { idempotencyKey },
    include: ACTION_INCLUDE,
  });
  if (existingAction) {
    return { action: existingAction, created: false };
  }

  try {
    const action = await prisma.toolAction.create({
      data: {
        ticketId,
        toolName: REPLACEMENT_TOOL,
        payload: JSON.stringify({
          orderId: ticket.order.orderId,
          sku,
          reason,
          idempotencyKey,
        }),
        riskLevel: "medium",
        requiresHumanApproval: true,
        status: "approval_required",
        idempotencyKey,
      },
      include: ACTION_INCLUDE,
    });
    return { action, created: true };
  } catch (error) {
    if (error.code === "P2002") {
      const action = await prisma.toolAction.findUnique({
        where: { idempotencyKey },
        include: ACTION_INCLUDE,
      });
      return { action, created: false };
    }
    throw error;
  }
}

async function decideAction(actionId, payload) {
  const { reviewerId, decision, reason } = payload || {};
  if (!reviewerId || !["approved", "rejected"].includes(decision)) {
    throw new AppError("reviewerId and an approved or rejected decision are required", 400);
  }

  const action = await getOperationalAction(actionId);
  if (!action.requiresHumanApproval) {
    throw new AppError("This action does not require approval", 422);
  }
  if (action.approval) {
    return action;
  }
  if (action.status !== "approval_required") {
    throw new AppError("This action is not awaiting approval", 422);
  }

  return prisma.$transaction(async (transaction) => {
    const approval = await transaction.approval.create({
      data: {
        actionId,
        reviewerId,
        decision,
        reason: reason || null,
      },
    });
    return transaction.toolAction.update({
      where: { actionId },
      data: { status: decision === "approved" ? "approved" : "rejected" },
      include: { approval: true },
    });
  });
}

async function executeAction(actionId) {
  const action = await getOperationalAction(actionId);
  if (action.status === "executed") {
    return action;
  }
  if (action.status !== "approved") {
    throw new AppError("This action must be approved before execution", 422);
  }

  return prisma.toolAction.update({
    where: { actionId },
    data: { status: "executed" },
    include: { approval: true },
  });
}

module.exports = {
  decideAction,
  executeAction,
  listTicketActions,
  requestReplacement,
};
