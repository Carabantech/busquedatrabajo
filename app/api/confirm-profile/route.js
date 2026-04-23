import { analyzeCandidateProfile, getActiveCandidateId, getActiveCandidateSnapshot, loadState, saveState } from '../../../lib/career-web';

export async function POST(request) {
  const candidateId = getActiveCandidateId();
  const { profileInputs } = await request.json();
  const analysis = analyzeCandidateProfile(candidateId);
  if (!analysis.complete) {
    return Response.json({ error: 'Todavia faltan datos para confirmar el perfil.' }, { status: 400 });
  }

  const current = loadState(candidateId);
  saveState({
    ...current,
    profileInputs: {
      ...current.profileInputs,
      ...profileInputs,
    },
    profileConfirmed: true,
    searchCompleted: false,
    generateCompleted: false,
    sendCompleted: false,
    jobs: [],
    selectedJobIds: [],
    batch: null,
  }, candidateId);

  return Response.json({ ...getActiveCandidateSnapshot(), analysis });
}
