import { getActiveCandidateId, getActiveCandidateSnapshot, loadState, saveState } from '../../../lib/career-web';

export async function POST(request) {
  const candidateId = getActiveCandidateId();
  const { jobId, checked } = await request.json();
  const current = loadState(candidateId);
  const selected = new Set(current.selectedJobIds || []);
  if (checked) selected.add(jobId);
  else selected.delete(jobId);

  saveState({
    ...current,
    selectedJobIds: Array.from(selected),
    generateCompleted: false,
    sendCompleted: false,
    batch: null,
  }, candidateId);

  return Response.json(getActiveCandidateSnapshot());
}
