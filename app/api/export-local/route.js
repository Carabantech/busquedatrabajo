import { exportBatchToLocalFolder, getActiveCandidateId, getActiveCandidateSnapshot, loadState, saveState } from '../../../lib/career-web';

export async function POST() {
  const candidateId = getActiveCandidateId();
  const current = loadState(candidateId);

  if (!current.generateCompleted || !current.batch?.id) {
    return Response.json({ error: 'Primero hay que generar la tanda.' }, { status: 400 });
  }

  const result = exportBatchToLocalFolder({ batchId: current.batch.id, candidateId });

  saveState({
    ...current,
    export: {
      exportedTo: result.exportedTo,
      files: result.files,
      exportedAt: new Date().toISOString(),
    },
  }, candidateId);

  return Response.json(getActiveCandidateSnapshot());
}
