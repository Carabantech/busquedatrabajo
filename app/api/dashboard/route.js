import { getActiveCandidateSnapshot, launchDashboardTui } from '../../../lib/career-web';

export async function POST() {
  const dashboard = launchDashboardTui();
  return Response.json({
    ...getActiveCandidateSnapshot(),
    dashboard,
  });
}
