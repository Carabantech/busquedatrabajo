import { createCandidate, getActiveCandidateSnapshot } from '../../../lib/career-web';

export async function POST(request) {
  const { name } = await request.json();
  if (!name || !name.trim()) {
    return Response.json({ error: 'Ingresa un nombre para crear el candidato.' }, { status: 400 });
  }
  createCandidate(name.trim());
  return Response.json(getActiveCandidateSnapshot());
}
