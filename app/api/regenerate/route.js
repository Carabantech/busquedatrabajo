import {
  buildBatchHistoryEntry,
  generateBatchForJobs,
  getActiveCandidateId,
  getActiveCandidateSnapshot,
  loadState,
  saveState,
  updatePortalStatsFromJobs,
  upsertBatchHistory,
} from '../../../lib/career-web';

export async function POST(request) {
  const candidateId = getActiveCandidateId();
  const { batchId } = await request.json();
  const current = loadState(candidateId);
  const previousBatch = (current.batchHistory || []).find(item => item.id === batchId);

  if (!previousBatch) {
    return Response.json({ error: 'No encontre esa tanda en el historial.' }, { status: 404 });
  }

  const jobs = previousBatch.jobs || [];
  if (!jobs.length) {
    return Response.json({ error: 'La tanda historica no tiene avisos guardados.' }, { status: 400 });
  }

  const batch = generateBatchForJobs(jobs, candidateId);
  const files = batch.files.flatMap(item => ([
    { name: item.mdName, kind: 'postulacion md', path: item.mdPath },
    { name: item.htmlName, kind: 'cv html', path: item.htmlPath },
    { name: item.pdfName, kind: 'cv pdf', path: item.pdfPath },
  ]));
  const batchEntry = buildBatchHistoryEntry(batch, jobs);

  saveState({
    ...current,
    portalStats: updatePortalStatsFromJobs(current.portalStats || {}, jobs, 'generated'),
    batchHistory: upsertBatchHistory(current.batchHistory || [], batchEntry),
    generateCompleted: true,
    sendCompleted: false,
    batch: {
      id: batch.batchId,
      files,
    },
  }, candidateId);

  return Response.json(getActiveCandidateSnapshot());
}
