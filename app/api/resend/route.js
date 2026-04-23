import { getActiveCandidateId, getActiveCandidateSnapshot, loadState, patchBatchHistory, saveState, sendBatchEmail } from '../../../lib/career-web';

export async function POST(request) {
  const candidateId = getActiveCandidateId();
  const { batchId, to } = await request.json();
  const current = loadState(candidateId);

  if (!batchId) {
    return Response.json({ error: 'Falta indicar la tanda a reenviar.' }, { status: 400 });
  }
  if (!to) {
    return Response.json({ error: 'Falta el mail de destino.' }, { status: 400 });
  }

  const result = sendBatchEmail({ batchId, to });
  saveState({
    ...current,
    batchHistory: patchBatchHistory(current.batchHistory || [], batchId, item => ({
      ...item,
      sentHistory: [
        {
          to,
          status: result.status,
          attachments: result.attachments,
          sentAt: new Date().toISOString(),
        },
        ...(item.sentHistory || []),
      ],
    })),
    sendCompleted: current.batch?.id === batchId ? true : current.sendCompleted,
    email: current.batch?.id === batchId ? {
      to,
      status: result.status,
      attachments: result.attachments,
      sentAt: new Date().toISOString(),
    } : current.email,
  }, candidateId);

  return Response.json(getActiveCandidateSnapshot());
}
