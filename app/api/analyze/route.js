import { analyzeCandidateProfile, getActiveCandidateId, getActiveCandidateSnapshot, loadState, saveState } from '../../../lib/career-web';

export async function POST(request) {
  const candidateId = getActiveCandidateId();
  const { profileInputs } = await request.json();
  const current = loadState(candidateId);
  saveState({
    ...current,
    profileInputs: {
      ...current.profileInputs,
      ...profileInputs,
    },
  }, candidateId);

  return Response.json({
    ...getActiveCandidateSnapshot(),
    analysis: analyzeCandidateProfile(candidateId),
  });
}
