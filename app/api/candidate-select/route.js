import { getActiveCandidateSnapshot, selectCandidate } from '../../../lib/career-web';

export async function POST(request) {
  const { candidateId } = await request.json();
  if (!candidateId) {
    return Response.json({ error: 'Falta candidateId.' }, { status: 400 });
  }
  selectCandidate(candidateId);
  return Response.json(getActiveCandidateSnapshot());
}
