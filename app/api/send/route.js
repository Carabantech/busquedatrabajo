import { getActiveCandidateId, getActiveCandidateSnapshot, loadState, saveState, sendBatchEmail } from '../../../lib/career-web';

export async function POST(request) {
  const candidateId = getActiveCandidateId();
  const { to } = await request.json();
  const current = loadState(candidateId);
  if (!current.generateCompleted || !current.batch?.id) {
    return Response.json({ error: 'Primero hay que generar la tanda.' }, { status: 400 });
  }
  if (!to) {
    return Response.json({ error: 'Falta el mail de destino.' }, { status: 400 });
  }

  const result = sendBatchEmail({ batchId: current.batch.id, to });
  saveState({
    ...current,
    sendCompleted: true,
    email: {
      to,
      status: result.status,
      attachments: result.attachments,
      sentAt: new Date().toISOString(),
    },
  }, candidateId);

  return Response.json(getActiveCandidateSnapshot());
}
