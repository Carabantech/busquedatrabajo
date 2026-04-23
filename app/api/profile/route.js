import { getActiveCandidateId, getActiveCandidateSnapshot, loadProfile, loadState, saveProfile, saveState } from '../../../lib/career-web';

export async function POST(request) {
  const candidateId = getActiveCandidateId();
  const { linkedin, profileInputs } = await request.json();
  const profile = loadProfile(candidateId);

  profile.candidate = profile.candidate || {};
  profile.compensation = profile.compensation || {};
  profile.location = profile.location || {};

  if (linkedin) profile.candidate.linkedin = linkedin;
  if (profileInputs?.minimumSalary) profile.compensation.minimum = profileInputs.minimumSalary;
  if (profileInputs?.workMode) profile.compensation.location_flexibility = profileInputs.workMode;

  if (profileInputs?.workArea) {
    const [city, country] = profileInputs.workArea.split(',').map(part => part.trim()).filter(Boolean);
    if (city) profile.location.city = city;
    if (country) profile.location.country = country;
  }

  saveProfile(profile, candidateId);
  const current = loadState(candidateId);
  saveState({
    ...current,
    profileInputs: {
      ...current.profileInputs,
      ...profileInputs,
    },
    profileConfirmed: false,
    searchCompleted: false,
    generateCompleted: false,
    sendCompleted: false,
    jobs: [],
    selectedJobIds: [],
    batch: null,
  }, candidateId);

  return Response.json(getActiveCandidateSnapshot());
}
