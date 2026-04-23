import { getActiveCandidateSnapshot } from '../../../lib/career-web';

export async function GET() {
  return Response.json(getActiveCandidateSnapshot());
}
