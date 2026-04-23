'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

const PROFILE_FIELDS = [
  { name: 'minimumSalary', label: 'Remuneracion minima en mano', placeholder: 'Ej: ARS 1.500.000 netos' },
  { name: 'workMode', label: 'Modalidad aceptable', placeholder: 'Presencial, hibrida, remota' },
  { name: 'workArea', label: 'Lugar de trabajo / zonas aceptables', placeholder: 'Mendoza, remoto fuera de Mendoza' },
  { name: 'englishLevel', label: 'Nivel de ingles', placeholder: 'Basico tecnico' },
  { name: 'excelLevel', label: 'Nivel de Excel', placeholder: 'Intermedio - avanzado' },
  { name: 'erpTools', label: 'ERP utilizados', placeholder: 'SAP, Sega' },
  { name: 'mobility', label: 'Movilidad / licencia / pasaporte', placeholder: 'Auto, licencia vigente, pasaporte al dia' },
  { name: 'restrictions', label: 'Restricciones u horarios a evitar', placeholder: 'No domingos, no nocturno' },
];

const STAGES = [
  { key: 'profile', title: 'Perfil', description: 'Subir CV, LinkedIn y completar datos faltantes.' },
  { key: 'search', title: 'Buscar', description: 'Encontrar avisos relevantes y elegir los mejores.' },
  { key: 'generate', title: 'Generar', description: 'Crear textos de postulacion y CVs en PDF.' },
  { key: 'send', title: 'Enviar', description: 'Mandar el paquete por mail al destinatario elegido.' },
];

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function workflowStageStatus(workflow, stageKey) {
  if (stageKey === 'profile') return workflow.profileConfirmed ? 'done' : 'active';
  if (stageKey === 'search') return workflow.searchCompleted ? 'done' : workflow.profileConfirmed ? 'active' : 'locked';
  if (stageKey === 'generate') return workflow.generateCompleted ? 'done' : workflow.searchCompleted ? 'active' : 'locked';
  if (stageKey === 'send') return workflow.sendCompleted ? 'done' : workflow.generateCompleted ? 'active' : 'locked';
  return 'locked';
}

export default function CareerWorkflow() {
  const [payload, setPayload] = useState(null);
  const [linkedIn, setLinkedIn] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [newCandidateName, setNewCandidateName] = useState('');
  const [profileForm, setProfileForm] = useState({
    minimumSalary: '',
    workMode: '',
    workArea: '',
    englishLevel: '',
    excelLevel: '',
    erpTools: '',
    mobility: '',
    restrictions: '',
  });
  const [notice, setNotice] = useState(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        hydrate(await requestJson('/api/status'));
      } catch (error) {
        setNotice({ type: 'warn', text: error.message });
      }
    });
  }, []);

  function hydrate(nextPayload) {
    setPayload(nextPayload);
    setLinkedIn(nextPayload.profile?.candidate?.linkedin || '');
    setRecipientEmail(nextPayload.state?.email?.to || nextPayload.profile?.candidate?.email || '');
    setProfileForm({
      minimumSalary: nextPayload.profile?.compensation?.minimum || '',
      workMode: nextPayload.profile?.compensation?.location_flexibility || '',
      workArea: `${nextPayload.profile?.location?.city || ''}${nextPayload.profile?.location?.country ? `, ${nextPayload.profile.location.country}` : ''}`.trim(),
      englishLevel: nextPayload.analysis?.profileInputs?.englishLevel || '',
      excelLevel: nextPayload.analysis?.profileInputs?.excelLevel || '',
      erpTools: nextPayload.analysis?.profileInputs?.erpTools || '',
      mobility: nextPayload.analysis?.profileInputs?.mobility || '',
      restrictions: nextPayload.analysis?.profileInputs?.restrictions || '',
    });
  }

  const workflow = payload?.state;
  const analysis = payload?.analysis;
  const selectedCount = useMemo(() => workflow?.selectedJobIds?.length || 0, [workflow]);
  const activeCandidate = useMemo(
    () => payload?.candidates?.find(item => item.id === payload?.activeCandidateId),
    [payload]
  );

  function setMessage(type, text) {
    setNotice({ type, text });
  }

  async function handleCvUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('cv', file);

    startTransition(async () => {
      try {
        hydrate(await requestJson('/api/upload-cv', { method: 'POST', body: formData }));
        setMessage('good', 'CV cargado correctamente para este candidato.');
      } catch (error) {
        setMessage('warn', error.message);
      }
    });
  }

  async function handleCandidateCreate() {
    if (!newCandidateName.trim()) {
      setMessage('warn', 'Escribi un nombre para crear el candidato.');
      return;
    }
    startTransition(async () => {
      try {
        hydrate(await requestJson('/api/candidate-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newCandidateName }),
        }));
        setNewCandidateName('');
        setMessage('good', 'Nuevo candidato creado y activado.');
      } catch (error) {
        setMessage('warn', error.message);
      }
    });
  }

  async function handleCandidateSelect(candidateId) {
    startTransition(async () => {
      try {
        hydrate(await requestJson('/api/candidate-select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId }),
        }));
        setMessage('info', 'Candidato cambiado.');
      } catch (error) {
        setMessage('warn', error.message);
      }
    });
  }

  async function handleProfileSave() {
    startTransition(async () => {
      try {
        hydrate(await requestJson('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkedin: linkedIn, profileInputs: profileForm }),
        }));
        setMessage('good', 'Datos base guardados.');
      } catch (error) {
        setMessage('warn', error.message);
      }
    });
  }

  async function handleAnalyze() {
    startTransition(async () => {
      try {
        const nextPayload = await requestJson('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileInputs: profileForm }),
        });
        hydrate(nextPayload);
        setMessage(nextPayload.analysis.complete ? 'good' : 'info', nextPayload.analysis.complete
          ? 'El perfil quedo listo para avanzar.'
          : 'Todavia hay datos pendientes para completar.');
      } catch (error) {
        setMessage('warn', error.message);
      }
    });
  }

  async function handleConfirmProfile() {
    startTransition(async () => {
      try {
        hydrate(await requestJson('/api/confirm-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileInputs: profileForm }),
        }));
        setMessage('good', 'Perfil confirmado. Ya se habilito la busqueda.');
      } catch (error) {
        setMessage('warn', error.message);
      }
    });
  }

  async function handleSearch() {
    startTransition(async () => {
      try {
        const nextPayload = await requestJson('/api/search', { method: 'POST' });
        hydrate(nextPayload);
        setMessage('good', `Busqueda completada con ${nextPayload.state.jobs.length} avisos rankeados.`);
      } catch (error) {
        setMessage('warn', error.message);
      }
    });
  }

  async function toggleJob(jobId, checked) {
    try {
      hydrate(await requestJson('/api/select-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, checked }),
      }));
    } catch (error) {
      setMessage('warn', error.message);
    }
  }

  async function handleGenerate() {
    startTransition(async () => {
      try {
        hydrate(await requestJson('/api/generate', { method: 'POST' }));
        setMessage('good', 'Tanda generada con textos y PDFs.');
      } catch (error) {
        setMessage('warn', error.message);
      }
    });
  }

  async function handleSend() {
    startTransition(async () => {
      try {
        hydrate(await requestJson('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: recipientEmail }),
        }));
        setMessage('good', `Mail enviado a ${recipientEmail}.`);
      } catch (error) {
        setMessage('warn', error.message);
      }
    });
  }

  async function handleExportLocal() {
    startTransition(async () => {
      try {
        hydrate(await requestJson('/api/export-local', { method: 'POST' }));
        setMessage('good', 'La tanda fue copiada a la carpeta local en C:\\output.');
      } catch (error) {
        setMessage('warn', error.message);
      }
    });
  }

  if (!payload) {
    return (
      <div className="page-shell">
        <div className="loading-card">Cargando workflow local...</div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Career Ops Local</span>
          <h1>Una herramienta para ayudarte en la busqueda de trabajo, organizar postulaciones y avanzar paso a paso.</h1>
          <p>
            La interfaz ahora guarda multiples candidatos, mejora la lectura visual del flujo y refina la busqueda
            para LinkedIn, Computrabajo, Bumeran, Indeed y HiringRoom con mejor ranking y filtrado.
          </p>
        </div>
        <div className="hero-summary card">
          <h3>Candidato activo</h3>
          <strong>{activeCandidate?.name || 'Sin seleccionar'}</strong>
          <div className="hero-stats">
            <span>{workflow.profileConfirmed ? 'Perfil confirmado' : 'Perfil pendiente'}</span>
            <span>{workflow.jobs?.length || 0} avisos</span>
            <span>{selectedCount} seleccionados</span>
          </div>
        </div>
      </section>

      <div className="main-grid">
        <aside className="sidebar stack">
          <section className="card stack">
            <div className="section-head compact">
              <div>
                <h2>Candidatos</h2>
                <p>Cada candidato guarda CV, perfil, estado y tandas por separado.</p>
              </div>
            </div>

            <div className="candidate-list">
              {payload.candidates.map(candidate => (
                <button
                  key={candidate.id}
                  className={`candidate-tile ${candidate.id === payload.activeCandidateId ? 'active' : ''}`}
                  onClick={() => handleCandidateSelect(candidate.id)}
                  disabled={isPending}
                >
                  <strong>{candidate.name}</strong>
                  <span>{candidate.email || 'Sin email cargado'}</span>
                  <small>
                    {candidate.profileConfirmed ? 'Perfil ok' : 'Perfil pendiente'} · {candidate.generateCompleted ? 'Con archivos' : 'Sin archivos'}
                  </small>
                </button>
              ))}
            </div>

            <div className="candidate-create">
              <input
                value={newCandidateName}
                onChange={(event) => setNewCandidateName(event.target.value)}
                placeholder="Nuevo candidato"
              />
              <button className="button ghost" onClick={handleCandidateCreate} disabled={isPending}>
                Crear
              </button>
            </div>
          </section>

          <section className="card stack">
            <div className="section-head compact">
              <div>
                <h2>Progreso</h2>
                <p>Las etapas siguen bloqueadas en orden.</p>
              </div>
            </div>
            <div className="timeline">
              {STAGES.map((stage, index) => {
                const status = workflowStageStatus(workflow, stage.key);
                return (
                  <div key={stage.key} className={`timeline-item ${status}`}>
                    <div className="timeline-index">{index + 1}</div>
                    <div>
                      <strong>{stage.title}</strong>
                      <p>{stage.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {notice && (
            <div className={`notice ${notice.type === 'good' ? 'good' : notice.type === 'info' ? 'info' : 'warn'}`}>
              {notice.text}
            </div>
          )}
        </aside>

        <main className="content stack">
          <section className="card stack">
            <div className="section-head">
              <div>
                <h2>1. Perfil base</h2>
                <p>Subi CV, agregá LinkedIn y deja el perfil listo para analizar.</p>
              </div>
              <span className={`stage-tag ${analysis.complete ? 'done' : 'active'}`}>perfil</span>
            </div>

            <div className="grid-2">
              <div className="field">
                <label>Subir CV</label>
                <input type="file" accept=".md,.txt,.pdf,.doc,.docx" onChange={handleCvUpload} />
              </div>
              <div className="field">
                <label>Link de LinkedIn</label>
                <input
                  type="url"
                  placeholder="https://www.linkedin.com/in/..."
                  value={linkedIn}
                  onChange={(event) => setLinkedIn(event.target.value)}
                />
              </div>
            </div>

            <div className="actions">
              <button className="button ghost" onClick={handleProfileSave} disabled={isPending}>
                Guardar datos base
              </button>
            </div>
          </section>

          <section className="card stack">
            <div className="section-head">
              <div>
                <h2>2. Analizar</h2>
                <p>Te muestra exactamente qué falta para dejar al candidato listo.</p>
              </div>
              <span className={`stage-tag ${analysis.complete ? 'done' : 'active'}`}>analizar</span>
            </div>

            <div className="grid-2">
              {PROFILE_FIELDS.map(field => (
                <div className="field" key={field.name}>
                  <label>{field.label}</label>
                  <input
                    value={profileForm[field.name]}
                    placeholder={field.placeholder}
                    onChange={(event) => setProfileForm(current => ({ ...current, [field.name]: event.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="actions">
              <button className="button secondary" onClick={handleAnalyze} disabled={isPending}>
                Analizar
              </button>
              <button className="button" onClick={handleConfirmProfile} disabled={isPending || !analysis.complete}>
                Confirmar perfil
              </button>
            </div>

            <div className="analysis-grid">
              <div className="analysis-card">
                <h3>Faltantes</h3>
                {analysis.missing.length ? (
                  <ul className="list">
                    {analysis.missing.map(item => <li key={item.field}>{item.label}</li>)}
                  </ul>
                ) : (
                  <p>El perfil ya tiene todo lo minimo para avanzar.</p>
                )}
              </div>
              <div className="analysis-card">
                <h3>Sugerencias</h3>
                <ul className="list">
                  {analysis.recommendations.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          </section>

          <section className="card stack">
            <div className="section-head">
              <div>
                <h2>3. Buscar</h2>
                <p>La busqueda ahora mezcla portales, parsea snippets y rankea por match.</p>
              </div>
              <span className={`stage-tag ${workflow.searchCompleted ? 'done' : workflow.profileConfirmed ? 'active' : 'locked'}`}>buscar</span>
            </div>

            <div className="actions">
              <button className="button" onClick={handleSearch} disabled={isPending || !workflow.profileConfirmed}>
                Buscar trabajos
              </button>
            </div>

            {workflow.jobs?.length ? (
              <div className="job-list">
                {workflow.jobs.map(job => (
                  <article key={job.id} className="job-card deluxe">
                    <div className="job-select">
                      <input
                        type="checkbox"
                        checked={(workflow.selectedJobIds || []).includes(job.id)}
                        onChange={(event) => toggleJob(job.id, event.target.checked)}
                      />
                      <span>Usar en la tanda</span>
                    </div>
                    <header>
                      <div>
                        <h4>{job.title}</h4>
                        <p>{job.company}</p>
                      </div>
                      <div className="job-badges">
                        <span className="badge portal">{job.portal}</span>
                        <span className="badge score">match {job.score}</span>
                      </div>
                    </header>
                    <p className="job-snippet">{job.snippet || 'Sin snippet disponible para este resultado.'}</p>
                    <div className="job-meta">
                      <a href={job.url} target="_blank" rel="noreferrer">{job.url}</a>
                    </div>
                    {job.matchReasons?.length > 0 && (
                      <div className="match-row">
                        {job.matchReasons.map(reason => (
                          <span key={`${job.id}-${reason}`} className="match-chip">{reason}</span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="notice info">Todavia no hay resultados para este candidato. Primero confirma perfil y ejecuta Buscar.</div>
            )}
          </section>

          <section className="card stack">
            <div className="section-head">
              <div>
                <h2>4. Generar y enviar</h2>
                <p>Genera los `.md` y `.pdf` seleccionados y luego manda la tanda por mail.</p>
              </div>
              <span className={`stage-tag ${workflow.generateCompleted ? 'done' : workflow.searchCompleted ? 'active' : 'locked'}`}>pipeline</span>
            </div>

            <div className="actions">
              <button className="button secondary" onClick={handleGenerate} disabled={isPending || !workflow.searchCompleted || selectedCount === 0}>
                Generar archivos
              </button>
              <button className="button ghost" onClick={handleExportLocal} disabled={isPending || !workflow.generateCompleted}>
                Guardar en carpeta local
              </button>
              <button className="button warn" onClick={handleSend} disabled={isPending || !workflow.generateCompleted || !recipientEmail}>
                Enviar paquete
              </button>
            </div>

            <div className="field">
              <label>Mail de destino</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder="correo@dominio.com"
              />
            </div>

            {workflow.batch?.files?.length ? (
              <div className="file-grid">
                {workflow.batch.files.map(file => (
                  <div key={file.path} className="file-item">
                    <span>{file.name}</span>
                    <span>{file.kind}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="notice info">La tanda todavia no fue generada para este candidato.</div>
            )}

            {workflow.email && (
              <div className="notice good">
                Ultimo envio: <strong>{workflow.email.to}</strong> · adjuntos <strong>{workflow.email.attachments}</strong> · estado <strong>{workflow.email.status}</strong>
              </div>
            )}

            {workflow.export?.exportedTo && (
              <div className="notice info">
                Ultima exportacion local: <strong>{workflow.export.exportedTo}</strong><br />
                Archivos copiados: <strong>{workflow.export.files}</strong>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
