import { prisma } from '../../config/db';

export interface TraceData {
  ticketId: string;
  runType: 'triage' | 'draft' | 'eval';
  retrievedDocs?: string[];
  toolAction?: string;
  guardrail: { blocked: boolean; reason?: string };
  finalStatus: string;
}

export async function createTrace(data: TraceData) {
  return prisma.trace.create({
    data: {
      ticketId: data.ticketId,
      runType: data.runType,
      retrievedDocs: JSON.stringify(data.retrievedDocs || []),
      toolAction: data.toolAction,
      guardrail: JSON.stringify(data.guardrail),
      finalStatus: data.finalStatus,
    },
  });
}

export async function getTrace(traceId: string) {
  const trace = await prisma.trace.findUnique({ where: { id: traceId } });
  if (!trace) return null;
  return {
    ...trace,
    retrievedDocs: JSON.parse(trace.retrievedDocs),
    guardrail: JSON.parse(trace.guardrail),
  };
}

export async function getTracesByTicket(ticketId: string) {
  const traces = await prisma.trace.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'desc' },
  });
  return traces.map((t) => ({
    ...t,
    retrievedDocs: JSON.parse(t.retrievedDocs),
    guardrail: JSON.parse(t.guardrail),
  }));
}
