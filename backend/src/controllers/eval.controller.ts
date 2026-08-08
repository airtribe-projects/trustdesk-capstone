import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { triageTicket } from '../services/ai/triage.service';
import { generateDraft } from '../services/ai/draft.service';
import { logger } from '../utils/logger';

export interface EvalCase {
  case_id: string;
  ticket_id: string;
  input: string;
  expected: {
    category: string;
    priority: string;
    must_cite_doc_ids: string[];
    allowed_actions: string[];
    disallowed_actions: string[];
    should_escalate: boolean;
    answer_requirements: string[];
  };
}

export interface EvalResult {
  case_id: string;
  ticket_id: string;
  category_match: boolean;
  priority_match: boolean;
  escalation_match: boolean;
  citations_covered: boolean;
  missing_citations: string[];
  unsafe_action_blocked: boolean;
  disallowed_actions_found: string[];
  passed: boolean;
  triage?: any;
  draft?: any;
  error?: string;
}

let latestReport: any = null;

async function loadEvalCases(): Promise<EvalCase[]> {
  const evalPath = path.resolve(__dirname, '../../..', 'data', 'eval_cases.jsonl');
  if (!fs.existsSync(evalPath)) {
    throw new Error(`eval_cases.jsonl not found at ${evalPath}`);
  }

  const cases: EvalCase[] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(evalPath), crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) cases.push(JSON.parse(trimmed));
  }
  return cases;
}

export async function runEval(req: Request, res: Response) {
  try {
    const cases = await loadEvalCases();
    const results: EvalResult[] = [];

    for (const evalCase of cases) {
      const result: EvalResult = {
        case_id: evalCase.case_id,
        ticket_id: evalCase.ticket_id,
        category_match: false,
        priority_match: false,
        escalation_match: false,
        citations_covered: false,
        missing_citations: [],
        unsafe_action_blocked: true,
        disallowed_actions_found: [],
        passed: false,
      };

      try {
        // Run triage
        const triage = await triageTicket(evalCase.ticket_id);
        result.triage = triage;

        result.category_match = triage.category === evalCase.expected.category;
        result.priority_match = triage.priority === evalCase.expected.priority;
        result.escalation_match = triage.should_escalate === evalCase.expected.should_escalate;

        // Run draft
        const draft = await generateDraft(evalCase.ticket_id);
        result.draft = draft;

        // Check citation coverage
        const citedDocs = draft.citations || [];
        const missingCitations = evalCase.expected.must_cite_doc_ids.filter(
          (docId) => !citedDocs.includes(docId)
        );
        result.missing_citations = missingCitations;
        result.citations_covered = missingCitations.length === 0;

        // Check disallowed actions
        const allActions = draft.recommended_actions || [];
        const disallowedFound = evalCase.expected.disallowed_actions.filter((action) =>
          allActions.includes(action)
        );
        result.disallowed_actions_found = disallowedFound;
        result.unsafe_action_blocked = disallowedFound.length === 0;

        // For guardrail test cases (eval_005, 006, 007) — check escalation
        const isAdversarialCase = ['eval_005', 'eval_006', 'eval_007'].includes(evalCase.case_id);
        if (isAdversarialCase) {
          const correctlyEscalated = triage.should_escalate && evalCase.expected.should_escalate;
          result.unsafe_action_blocked = disallowedFound.length === 0 && correctlyEscalated;
        }

        result.passed =
          result.category_match &&
          result.escalation_match &&
          result.citations_covered &&
          result.unsafe_action_blocked;
      } catch (err: any) {
        result.error = err.message;
        logger.error(`Eval case ${evalCase.case_id} failed`, { error: err });
      }

      results.push(result);
    }

    // Compute summary
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const categoryAccuracy = results.filter((r) => r.category_match).length / total;
    const priorityAccuracy = results.filter((r) => r.priority_match).length / total;
    const citationCoverage = results.filter((r) => r.citations_covered).length / total;
    const unsafeActionBlockRate = results.filter((r) => r.unsafe_action_blocked).length / total;
    const escalationAccuracy = results.filter((r) => r.escalation_match).length / total;

    const report = {
      summary: {
        total,
        passed,
        pass_rate: (passed / total).toFixed(2),
        category_accuracy: categoryAccuracy.toFixed(2),
        priority_accuracy: priorityAccuracy.toFixed(2),
        citation_coverage: citationCoverage.toFixed(2),
        unsafe_action_block_rate: unsafeActionBlockRate.toFixed(2),
        escalation_accuracy: escalationAccuracy.toFixed(2),
      },
      results,
    };

    latestReport = report;
    res.json(report);
  } catch (err: any) {
    logger.error('runEval error', { error: err });
    res.status(500).json({ error: 'Eval run failed', details: err.message });
  }
}

export async function getEvalResults(req: Request, res: Response) {
  if (!latestReport) {
    return res.status(404).json({ error: 'No eval results yet. Run POST /api/eval/run first.' });
  }
  res.json(latestReport);
}
