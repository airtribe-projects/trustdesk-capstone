import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { searchKnowledge } from '../services/rag/retriever.service';
import { logger } from '../utils/logger';

export async function ingestDocuments(req: Request, res: Response) {
  try {
    const { documents } = req.body;
    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'documents array is required' });
    }

    const ingested: string[] = [];
    for (const doc of documents) {
      const { doc_id, title, content, category } = doc;
      if (!doc_id || !title || !content) {
        continue;
      }
      await prisma.knowledgeDocument.upsert({
        where: { id: doc_id },
        create: { id: doc_id, title, category: category || 'general', content },
        update: { title, category: category || 'general', content },
      });
      ingested.push(doc_id);
    }

    res.json({ ingested: ingested.length, document_ids: ingested });
  } catch (err) {
    logger.error('ingestDocuments error', { error: err });
    res.status(500).json({ error: 'Ingestion failed' });
  }
}

export async function searchDocuments(req: Request, res: Response) {
  try {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

    const results = await searchKnowledge(q, 5);
    res.json({
      query: q,
      results: results.map(({ content: _, ...r }) => r),
    });
  } catch (err) {
    logger.error('searchDocuments error', { error: err });
    res.status(500).json({ error: 'Search failed' });
  }
}

export async function listDocuments(req: Request, res: Response) {
  try {
    const docs = await prisma.knowledgeDocument.findMany({
      select: { id: true, title: true, category: true },
    });
    res.json({ documents: docs });
  } catch (err) {
    logger.error('listDocuments error', { error: err });
    res.status(500).json({ error: 'Failed to list documents' });
  }
}

export async function getTrace(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const trace = await prisma.trace.findUnique({ where: { id } });
    if (!trace) return res.status(404).json({ error: 'Trace not found' });
    res.json({
      trace: {
        ...trace,
        retrievedDocs: JSON.parse(trace.retrievedDocs),
        guardrail: JSON.parse(trace.guardrail),
      },
    });
  } catch (err) {
    logger.error('getTrace error', { error: err });
    res.status(500).json({ error: 'Failed to get trace' });
  }
}
