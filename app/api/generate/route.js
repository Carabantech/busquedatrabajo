import { generateBatchForJobs, getActiveCandidateId, getActiveCandidateSnapshot, loadState, saveState } from '../../../lib/career-web';

export async function POST() {
  const candidateId = getActiveCandidateId();
  const current = loadState(candidateId);
  if (!current.searchCompleted) {
    return Response.json({ error: 'Primero hay que ejecutar Buscar.' }, { status: 400 });
  }

  const selectedJobs = (current.jobs || []).filter(job => (current.selectedJobIds || []).includes(job.id));
  if (selectedJobs.length === 0) {
    return Response.json({ error: 'Selecciona al menos un aviso antes de generar.' }, { status: 400 });
  }

  const batch = generateBatchForJobs(selectedJobs, candidateId);
  const files = batch.files.flatMap(item => ([
    { name: item.mdName, kind: 'postulacion md', path: item.mdPath },
    { name: item.htmlName, kind: 'cv html', path: item.htmlPath },
    { name: item.pdfName, kind: 'cv pdf', path: item.pdfPath },
  ]));

  saveState({
    ...current,
    generateCompleted: true,
    sendCompleted: false,
    batch: {
      id: batch.batchId,
      files,
    },
  }, candidateId);

  return Response.json(getActiveCandidateSnapshot());
}
