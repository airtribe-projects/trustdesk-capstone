import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { executeToolAction, rejectToolAction } from '../services/tools/tool.service';
import { logger } from '../utils/logger';

export async function listPendingApprovals(req: Request, res: Response) {
  try {
    const toolActions = await prisma.toolAction.findMany({
      where: { status: 'PENDING' },
      include: {
        ticket: {
          include: {
            customer: { select: { name: true, email: true, tier: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = toolActions.map((a) => ({
      ...a,
      params: JSON.parse(a.params),
      result: a.result ? JSON.parse(a.result) : null,
    }));

    res.json({ approvals: enriched });
  } catch (err) {
    logger.error('listPendingApprovals error', { error: err });
    res.status(500).json({ error: 'Failed to list approvals' });
  }
}

export async function approveAction(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const approvedBy = req.user?.email || req.body.approvedBy || 'human_reviewer';

    const toolAction = await executeToolAction(id, approvedBy);
    res.json({ toolAction: { ...toolAction, params: JSON.parse(toolAction.params), result: toolAction.result ? JSON.parse(toolAction.result) : null } });
  } catch (err: any) {
    logger.error('approveAction error', { error: err });
    res.status(400).json({ error: err.message || 'Approval failed' });
  }
}

export async function rejectAction(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const rejectedBy = req.user?.email || req.body.rejectedBy || 'human_reviewer';

    const toolAction = await rejectToolAction(id, rejectedBy);
    res.json({ toolAction: { ...toolAction, params: JSON.parse(toolAction.params), result: toolAction.result ? JSON.parse(toolAction.result) : null } });
  } catch (err: any) {
    logger.error('rejectAction error', { error: err });
    res.status(400).json({ error: err.message || 'Rejection failed' });
  }
}

export async function getApproval(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const toolAction = await prisma.toolAction.findUnique({
      where: { id },
      include: {
        ticket: {
          include: { customer: true, order: true, triage: true },
        },
      },
    });
    if (!toolAction) return res.status(404).json({ error: 'Tool action not found' });
    res.json({ toolAction: { ...toolAction, params: JSON.parse(toolAction.params), result: toolAction.result ? JSON.parse(toolAction.result) : null } });
  } catch (err) {
    logger.error('getApproval error', { error: err });
    res.status(500).json({ error: 'Failed to get approval' });
  }
}
