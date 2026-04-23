import { buildSearchHistoryEntry, getActiveCandidateId, getActiveCandidateSnapshot, loadState, saveState, searchJobsForProfile, updatePortalStatsFromJobs } from '../../../lib/career-web';

export async function POST(request) {
  const candidateId = getActiveCandidateId();
  const current = loadState(candidateId);
  const body = await request.json().catch(() => ({}));
  if (!current.profileConfirmed) {
    return Response.json({ error: 'Primero confirma el perfil antes de buscar.' }, { status: 400 });
  }

  const nextState = {
    ...current,
    profileInputs: {
      ...current.profileInputs,
      ...(body.profileInputs || {}),
    },
  };
  saveState(nextState, candidateId);

  const jobs = await searchJobsForProfile(candidateId);
  const searchedPortals = new Set(nextState.profileInputs.enabledPortals || []);
  const portalStats = {
    ...(nextState.portalStats || {}),
  };
  const now = new Date().toISOString();
  for (const portal of searchedPortals) {
    portalStats[portal] = {
      searches: 0,
      results: 0,
      selected: 0,
      generated: 0,
      ...(portalStats[portal] || {}),
      searches: (portalStats[portal]?.searches || 0) + 1,
      lastSeenAt: now,
    };
  }
  const nextPortalStats = updatePortalStatsFromJobs(portalStats, jobs, 'results');
  const searchEntry = buildSearchHistoryEntry(nextState.profileInputs, jobs);

  saveState({
    ...nextState,
    portalStats: nextPortalStats,
    searchHistory: [searchEntry, ...(nextState.searchHistory || [])],
    jobs,
    selectedJobIds: jobs.slice(0, 6).map(job => job.id),
    searchCompleted: jobs.length > 0,
    generateCompleted: false,
    sendCompleted: false,
    batch: null,
  }, candidateId);

  return Response.json(getActiveCandidateSnapshot());
}
