import { getActiveCandidateId, getActiveCandidateSnapshot, loadState, saveState, updatePortalStatsFromJobs } from '../../../lib/career-web';

export async function POST(request) {
  const candidateId = getActiveCandidateId();
  const { jobId, checked } = await request.json();
  const current = loadState(candidateId);
  const selected = new Set(current.selectedJobIds || []);
  const job = (current.jobs || []).find(item => item.id === jobId);
  if (checked) selected.add(jobId);
  else selected.delete(jobId);

  saveState({
    ...current,
    portalStats: checked && job ? updatePortalStatsFromJobs(current.portalStats || {}, [job], 'selected') : current.portalStats,
    selectedJobIds: Array.from(selected),
    generateCompleted: false,
    sendCompleted: false,
    batch: null,
  }, candidateId);

  return Response.json(getActiveCandidateSnapshot());
}
