import { getActiveCandidateId, getActiveCandidateSnapshot, loadState, saveCvText, saveState, saveUploadedCv } from '../../../lib/career-web';

export async function POST(request) {
  const candidateId = getActiveCandidateId();
  const formData = await request.formData();
  const file = formData.get('cv');
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'No se recibio ningun archivo.' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const savedPath = saveUploadedCv(file.name, bytes, candidateId);

  if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
    saveCvText(bytes.toString('utf8'), candidateId);
  }

  const current = loadState(candidateId);
  saveState({
    ...current,
    uploads: {
      ...current.uploads,
      cv: {
        originalName: file.name,
        savedPath,
      },
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
