import { getActiveCandidateId, getActiveCandidateSnapshot, loadState, saveState, searchJobsForProfile } from '../../../lib/career-web';

export async function POST() {
  const candidateId = getActiveCandidateId();
  const current = loadState(candidateId);
  if (!current.profileConfirmed) {
    return Response.json({ error: 'Primero confirma el perfil antes de buscar.' }, { status: 400 });
  }

  const jobs = await searchJobsForProfile(candidateId);
  saveState({
    ...current,
    jobs,
    selectedJobIds: jobs.slice(0, 6).map(job => job.id),
    searchCompleted: jobs.length > 0,
    generateCompleted: false,
    sendCompleted: false,
    batch: null,
  }, candidateId);

  return Response.json(getActiveCandidateSnapshot());
}
