import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { triageTicket } from '../services/ai/triage.service';
import { generateDraft } from '../services/ai/draft.service';
import { requestToolAction } from '../services/tools/tool.service';
import { searchKnowledge } from '../services/rag/retriever.service';
import { logger } from '../utils/logger';

export async function listTickets(req: Request, res: Response) {
  try {
    const tickets = await prisma.ticket.findMany({
      include: {
        customer: { select: { id: true, name: true, tier: true, email: true } },
        order: { select: { id: true, status: true, total: true, currency: true } },
        triage: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ tickets });
  } catch (err) {
    logger.error('listTickets error', { error: err });
    res.status(500).json({ error: 'Failed to list tickets' });
  }
}

export async function getTicket(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: true,
        order: true,
        triage: true,
        draft: true,
        toolActions: { orderBy: { createdAt: 'desc' } },
        approvals: { orderBy: { approvedAt: 'desc' } },
        traces: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Parse JSON fields
    const enriched = {
      ...ticket,
      order: ticket.order ? {
        ...ticket.order,
        items: JSON.parse(ticket.order.items),
      } : null,
      customer: {
        ...ticket.customer,
        tags: JSON.parse(ticket.customer.tags),
      },
      draft: ticket.draft ? {
        ...ticket.draft,
        citations: JSON.parse(ticket.draft.citations),
        recommendedActions: JSON.parse(ticket.draft.recommendedActions),
      } : null,
      toolActions: ticket.toolActions.map((a) => ({
        ...a,
        params: JSON.parse(a.params),
        result: a.result ? JSON.parse(a.result) : null,
      })),
      traces: ticket.traces.map((t) => ({
        ...t,
        retrievedDocs: JSON.parse(t.retrievedDocs),
        guardrail: JSON.parse(t.guardrail),
      })),
    };

    res.json({ ticket: enriched });
  } catch (err) {
    logger.error('getTicket error', { error: err });
    res.status(500).json({ error: 'Failed to get ticket' });
  }
}

export async function createTicket(req: Request, res: Response) {
  try {
    const { customerId, orderId, subject, message, channel } = req.body;
    if (!customerId || !subject || !message) {
      return res.status(400).json({ error: 'customerId, subject, and message are required' });
    }

    const ticket = await prisma.ticket.create({
      data: {
        id: `tkt_${Date.now()}`,
        customerId,
        orderId: orderId || null,
        subject,
        message,
        channel: channel || 'email',
        createdAt: new Date(),
      },
    });

    res.status(201).json({ ticket });
  } catch (err) {
    logger.error('createTicket error', { error: err });
    res.status(500).json({ error: 'Failed to create ticket' });
  }
}

export async function runTriage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await triageTicket(id);
    res.json({ triage: result });
  } catch (err: any) {
    logger.error('runTriage error', { error: err });
    if (err.message?.includes('not found')) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Triage failed', details: err.message });
  }
}

export async function runDraft(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await generateDraft(id);
    res.json({ draft: result });
  } catch (err: any) {
    logger.error('runDraft error', { error: err });
    if (err.message?.includes('not found')) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Draft generation failed', details: err.message });
  }
}

export async function requestTool(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { toolName, params, idempotencyKey } = req.body;

    if (!toolName || !idempotencyKey) {
      return res.status(400).json({ error: 'toolName and idempotencyKey are required' });
    }

    const toolAction = await requestToolAction({
      ticketId: id,
      toolName,
      params: params || {},
      idempotencyKey,
      requestedBy: req.user?.email,
    });

    res.json({ toolAction: { ...toolAction, params: JSON.parse(toolAction.params) } });
  } catch (err: any) {
    logger.error('requestTool error', { error: err });
    res.status(400).json({ error: err.message || 'Tool action failed' });
  }
}

export async function searchKnowledgeBase(req: Request, res: Response) {
  try {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

    const results = await searchKnowledge(q, 5);
    res.json({ query: q, results: results.map(({ content: _, ...r }) => r) });
  } catch (err) {
    logger.error('searchKnowledgeBase error', { error: err });
    res.status(500).json({ error: 'Search failed' });
  }
}
