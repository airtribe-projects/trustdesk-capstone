import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { login, getMe } from '../controllers/auth.controller';
import {
  listTickets, getTicket, createTicket, runTriage, runDraft, requestTool,
} from '../controllers/ticket.controller';
import {
  listPendingApprovals, approveAction, rejectAction, getApproval,
} from '../controllers/approval.controller';
import { runEval, getEvalResults } from '../controllers/eval.controller';
import { ingestDocuments, searchDocuments, listDocuments, getTrace } from '../controllers/knowledge.controller';

const router = Router();

// Auth
router.post('/auth/login', login);
router.get('/auth/me', authenticate, getMe);

// Tickets
router.get('/tickets', authenticate, listTickets);
router.get('/tickets/:id', authenticate, getTicket);
router.post('/tickets', authenticate, createTicket);
router.post('/tickets/:id/triage', authenticate, runTriage);
router.post('/tickets/:id/draft', authenticate, runDraft);
router.post('/tickets/:id/tools', authenticate, requestTool);

// Approvals
router.get('/approvals', authenticate, listPendingApprovals);
router.get('/approvals/:id', authenticate, getApproval);
router.post('/approvals/:id/approve', authenticate, approveAction);
router.post('/approvals/:id/reject', authenticate, rejectAction);

// Knowledge base
router.post('/knowledge/ingest', authenticate, ingestDocuments);
router.get('/knowledge/search', authenticate, searchDocuments);
router.get('/knowledge', authenticate, listDocuments);

// Traces
router.get('/traces/:id', authenticate, getTrace);

// Eval
router.post('/eval/run', authenticate, runEval);
router.get('/eval/results', authenticate, getEvalResults);

export default router;
