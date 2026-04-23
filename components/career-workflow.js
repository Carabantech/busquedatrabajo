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

const SEARCH_PORTALS = ['LinkedIn', 'Computrabajo', 'Bumeran', 'Indeed', 'HiringRoom', 'ZonaJobs', 'Adecco', 'Randstad', 'Manpower', 'Jooble'];

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

function nextStepCopy(workflow, analysis, selectedCount, recipientEmail) {
  if (!analysis.complete) {
    return { title: 'Completa el perfil', text: 'Carga los datos faltantes y usa Revisar perfil para verificar que todo quede listo.' };
  }
  if (!workflow.profileConfirmed) {
    return { title: 'Termina el perfil', text: 'Cuando ya no queden faltantes, usa Terminar perfil para habilitar la búsqueda.' };
  }
  if (!workflow.searchCompleted) {
    return { title: 'Busca avisos', text: 'Configura los portales y presiona Buscar avisos para traer resultados.' };
  }
  if (selectedCount === 0) {
    return { title: 'Elige avisos', text: 'Marca al menos un aviso para poder generar los archivos.' };
  }
  if (!workflow.generateCompleted) {
    return { title: 'Genera los archivos', text: 'Presiona Generar archivos para crear los textos y PDFs de postulación.' };
  }
  if (!recipientEmail) {
    return { title: 'Escribe un mail', text: 'Carga un correo de destino para poder enviar o reenviar la tanda.' };
  }
  return { title: 'Comparte la tanda', text: 'Ya puedes guardar los archivos en carpeta local o enviarlos por mail.' };
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
  const [searchForm, setSearchForm] = useState({
    enabledPortals: SEARCH_PORTALS,
    searchMode: 'ambos',
    searchLocation: '',
    requiredKeywords: '',
    excludedKeywords: '',
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
    setSearchForm({
      enabledPortals: nextPayload.analysis?.profileInputs?.enabledPortals?.length
        ? nextPayload.analysis.profileInputs.enabledPortals
        : SEARCH_PORTALS,
      searchMode: nextPayload.analysis?.profileInputs?.searchMode || 'ambos',
      searchLocation: nextPayload.analysis?.profileInputs?.searchLocation || nextPayload.profile?.location?.city || '',
      requiredKeywords: nextPayload.analysis?.profileInputs?.requiredKeywords || '',
      excludedKeywords: nextPayload.analysis?.profileInputs?.excludedKeywords || '',
    });
  }

  const workflow = payload?.state || {};
  const analysis = payload?.analysis || { complete: false, missing: [], recommendations: [], profileInputs: {} };
  const tools = payload?.tools || {};
  const dashboardTool = tools.dashboard || {};
  const suggestedPortals = payload?.suggestedPortals || [];
  const searchHistory = workflow?.searchHistory || [];
  const batchHistory = workflow?.batchHistory || [];
  const selectedCount = useMemo(() => workflow?.selectedJobIds?.length || 0, [workflow]);
  const activeCandidate = useMemo(
    () => payload?.candidates?.find(item => item.id === payload?.activeCandidateId),
    [payload]
  );
  const nextStep = nextStepCopy(workflow, analysis, selectedCount, recipientEmail);

  function setMessage(type, text) {
    setNotice({ type, text });
  }

  function buildProfileInputs() {
    return {
      ...profileForm,
      ...searchForm,
    };
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
          body: JSON.stringify({ linkedin: linkedIn, profileInputs: buildProfileInputs() }),
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
          body: JSON.stringify({ profileInputs: buildProfileInputs() }),
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
          body: JSON.stringify({ profileInputs: buildProfileInputs() }),
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
        const nextPayload = await requestJson('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileInputs: buildProfileInputs() }),
        });
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

  function togglePortalSelection(portal) {
    setSearchForm(current => {
      const nextPortals = current.enabledPortals.includes(portal)
        ? current.enabledPortals.filter(item => item !== portal)
        : [...current.enabledPortals, portal];

      return {
        ...current,
        enabledPortals: nextPortals.length ? nextPortals : current.enabledPortals,
      };
    });
  }

  function activateSuggestedPortals(portals) {
    setSearchForm(current => ({
      ...current,
      enabledPortals: [...new Set([...current.enabledPortals, ...portals])],
    }));
  }

  async function rerunSearch(searchEntry) {
    const profileInputs = {
      ...buildProfileInputs(),
      ...(searchEntry.preferences || {}),
    };
    setSearchForm(current => ({
      ...current,
      ...(searchEntry.preferences || {}),
    }));

    startTransition(async () => {
      try {
        const nextPayload = await requestJson('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileInputs }),
        });
        hydrate(nextPayload);
        setMessage('good', 'Busqueda repetida usando una configuracion del historial.');
      } catch (error) {
        setMessage('warn', error.message);
      }
    });
  }

  async function handleRegenerate(batchId) {
    startTransition(async () => {
      try {
        const nextPayload = await requestJson('/api/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId }),
        });
        hydrate(nextPayload);
        setMessage('good', 'Tanda regenerada desde el historial.');
      } catch (error) {
        setMessage('warn', error.message);
      }
    });
  }

  async function handleResend(batchId) {
    startTransition(async () => {
      try {
        const nextPayload = await requestJson('/api/resend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId, to: recipientEmail }),
        });
        hydrate(nextPayload);
        setMessage('good', `Tanda reenviada a ${recipientEmail}.`);
      } catch (error) {
        setMessage('warn', error.message);
      }
    });
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

  async function handleLaunchDashboard() {
    startTransition(async () => {
      try {
        const nextPayload = await requestJson('/api/dashboard', { method: 'POST' });
        hydrate(nextPayload);
        setMessage('good', nextPayload.dashboard?.message || 'Dashboard abierto correctamente.');
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

      <section className="workflow-guide card">
        {STAGES.map((stage, index) => {
          const status = workflowStageStatus(workflow, stage.key);
          return (
            <div key={stage.key} className={`guide-item ${status}`}>
              <span>{index + 1}</span>
              <div>
                <strong>{stage.title}</strong>
                <p>{stage.description}</p>
              </div>
            </div>
          );
        })}
      </section>

      <div className="main-grid">
        <aside className="sidebar stack">
          <section className={`card stack step-card ${!workflow.searchCompleted ? 'locked-step' : ''}`}>
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

          <section className="card stack step-card">
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

          <section className="card stack step-card">
            <div className="section-head compact">
              <div>
                <h2>Herramientas extra</h2>
                <p>Si queres, desde aca tambien podes abrir el dashboard de terminal.</p>
              </div>
            </div>

            <div className="tool-card">
              <strong>Dashboard en terminal</strong>
              <p>
                Abre la herramienta secundaria de `dashboard/` en otra ventana para ver el pipeline fuera de la web.
              </p>
              <button
                className="button ghost"
                onClick={handleLaunchDashboard}
                disabled={isPending || !dashboardTool.available || !dashboardTool.goInstalled}
              >
                Abrir dashboard
              </button>
              {dashboardTool.goInstalled ? (
                <small className="tool-note">Go detectado: {dashboardTool.goVersion}</small>
              ) : (
                <small className="tool-note warn-text">
                  {dashboardTool.launchBlockedReason || 'Instala Go para habilitar esta opcion.'}
                </small>
              )}
            </div>
          </section>

          {notice && (
            <div className={`notice ${notice.type === 'good' ? 'good' : notice.type === 'info' ? 'info' : 'warn'}`}>
              {notice.text}
            </div>
          )}

          <div className="card next-step-card">
            <small>Que sigue ahora</small>
            <strong>{nextStep.title}</strong>
            <p>{nextStep.text}</p>
          </div>
        </aside>

        <main className="content stack">
          <section className="card stack">
            <div className="section-head">
              <div>
                <h2>Paso 1. Carga inicial</h2>
                <p>Empieza subiendo el CV y pegando el link de LinkedIn del candidato.</p>
              </div>
              <span className={`stage-tag ${analysis.complete ? 'done' : 'active'}`}>perfil</span>
            </div>

            <div className="helper-banner">
              <strong>Primero guarda lo básico.</strong>
              <p>Con eso la app ya puede empezar a analizar el perfil y sugerir mejores búsquedas.</p>
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
                Guardar perfil
              </button>
            </div>
          </section>

          <section className="card stack">
            <div className="section-head">
              <div>
                <h2>Paso 2. Completa el perfil</h2>
                <p>La app te muestra qué falta y te ayuda a dejar el perfil listo para buscar.</p>
              </div>
              <span className={`stage-tag ${analysis.complete ? 'done' : 'active'}`}>analizar</span>
            </div>

            <div className="helper-banner">
              <strong>Completa lo que falte y revisa.</strong>
              <p>Cuando ya no haya faltantes, usa Terminar perfil para habilitar la búsqueda.</p>
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
                Revisar perfil
              </button>
              <button className="button" onClick={handleConfirmProfile} disabled={isPending || !analysis.complete}>
                Terminar perfil
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

          <section className={`card stack step-card ${!workflow.profileConfirmed ? 'locked-step' : ''}`}>
            <div className="section-head">
              <div>
                <h2>Paso 3. Busca avisos</h2>
                <p>Elige dónde buscar, ajusta filtros simples y trae los avisos más compatibles.</p>
              </div>
              <span className={`stage-tag ${workflow.searchCompleted ? 'done' : workflow.profileConfirmed ? 'active' : 'locked'}`}>buscar</span>
            </div>

            {!workflow.profileConfirmed && (
              <div className="helper-banner locked">
                <strong>Este paso se habilita después de terminar el perfil.</strong>
                <p>Primero completa y confirma el perfil del candidato.</p>
              </div>
            )}

            <div className="search-config">
              <div className="analysis-card">
                <h3>Portales</h3>
                <div className="portal-grid">
                  {SEARCH_PORTALS.map(portal => (
                    <label key={portal} className={`portal-chip ${searchForm.enabledPortals.includes(portal) ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={searchForm.enabledPortals.includes(portal)}
                        onChange={() => togglePortalSelection(portal)}
                      />
                      <span>{portal}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="analysis-card">
                <h3>Preferencias de busqueda</h3>
                <div className="grid-2">
                  <div className="field">
                    <label>Modalidad a priorizar</label>
                    <select
                      value={searchForm.searchMode}
                      onChange={(event) => setSearchForm(current => ({ ...current, searchMode: event.target.value }))}
                    >
                      <option value="ambos">Presencial, hibrido y remoto</option>
                      <option value="presencial">Solo presencial</option>
                      <option value="hibrido">Solo hibrido</option>
                      <option value="remoto">Solo remoto</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Ubicacion para buscar</label>
                    <input
                      value={searchForm.searchLocation}
                      placeholder="Ej: Mendoza, Buenos Aires o Remoto Argentina"
                      onChange={(event) => setSearchForm(current => ({ ...current, searchLocation: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>Palabras clave obligatorias</label>
                    <input
                      value={searchForm.requiredKeywords}
                      placeholder="Ej: SAP, compras, supply chain"
                      onChange={(event) => setSearchForm(current => ({ ...current, requiredKeywords: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>Palabras a excluir</label>
                    <input
                      value={searchForm.excludedKeywords}
                      placeholder="Ej: nocturno, domingo, ventas"
                      onChange={(event) => setSearchForm(current => ({ ...current, excludedKeywords: event.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {suggestedPortals.length > 0 && (
              <div className="analysis-card">
                <div className="section-head compact">
                  <div>
                    <h3>Portales sugeridos</h3>
                    <p>La app recomienda estos portales segun el perfil y la zona cargada.</p>
                  </div>
                  <button
                    className="button ghost"
                    onClick={() => activateSuggestedPortals(suggestedPortals.map(item => item.portal))}
                    disabled={isPending}
                  >
                    Activar sugeridos
                  </button>
                </div>
                <div className="suggestion-list">
                  {suggestedPortals.map(item => (
                    <div key={item.portal} className={`suggestion-item ${item.active ? 'active' : ''}`}>
                      <div>
                        <strong>{item.portal}</strong>
                        <p>{item.reason}</p>
                        {item.stats && (
                          <small className="suggestion-stats">
                            Busquedas {item.stats.searches || 0} · resultados {item.stats.results || 0} · seleccionados {item.stats.selected || 0}
                          </small>
                        )}
                      </div>
                      <button
                        className="button ghost"
                        onClick={() => activateSuggestedPortals([item.portal])}
                        disabled={isPending || searchForm.enabledPortals.includes(item.portal)}
                      >
                        {searchForm.enabledPortals.includes(item.portal) ? 'Activo' : 'Activar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchHistory.length > 0 && (
              <div className="analysis-card">
                <div className="section-head compact">
                  <div>
                    <h3>Historial de busquedas</h3>
                    <p>Te deja repetir rapidamente una configuracion anterior.</p>
                  </div>
                </div>
                <div className="history-list">
                  {searchHistory.slice(0, 6).map(item => (
                    <div key={item.id} className="history-item">
                      <div>
                        <strong>{item.resultsCount} resultados</strong>
                        <p>
                          {item.preferences?.searchLocation || 'Sin ubicacion'} · {item.preferences?.searchMode || 'ambos'} · {item.portalsWithResults?.join(', ') || 'sin portales'}
                        </p>
                        <small className="suggestion-stats">
                          {new Date(item.searchedAt).toLocaleString('es-AR')}
                        </small>
                      </div>
                      <button
                        className="button ghost"
                        onClick={() => rerunSearch(item)}
                        disabled={isPending || !workflow.profileConfirmed}
                      >
                        Buscar de nuevo
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="actions">
              <button className="button" onClick={handleSearch} disabled={isPending || !workflow.profileConfirmed}>
                Buscar avisos
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
                <h2>Paso 4. Genera y comparte</h2>
                <p>Con los avisos elegidos, crea los archivos finales y decide si los guardas o los envías.</p>
              </div>
              <span className={`stage-tag ${workflow.generateCompleted ? 'done' : workflow.searchCompleted ? 'active' : 'locked'}`}>pipeline</span>
            </div>

            {!workflow.searchCompleted && (
              <div className="helper-banner locked">
                <strong>Este paso se habilita después de buscar avisos.</strong>
                <p>Busca avisos y marca al menos uno para poder generar archivos.</p>
              </div>
            )}

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

            {batchHistory.length > 0 && (
              <div className="analysis-card">
                <div className="section-head compact">
                  <div>
                    <h3>Historial de tandas</h3>
                    <p>Reusa tandas anteriores para regenerar o reenviar sin rehacer todo.</p>
                  </div>
                </div>
                <div className="history-list">
                  {batchHistory.slice(0, 6).map(item => (
                    <div key={item.id} className="history-item">
                      <div>
                        <strong>{item.jobCount} avisos · {item.filesCount} archivos</strong>
                        <p>{item.jobs?.map(job => `${job.company} - ${job.title}`).slice(0, 2).join(' | ') || 'Tanda sin detalle'}</p>
                        <small className="suggestion-stats">
                          {new Date(item.createdAt).toLocaleString('es-AR')} · envios {item.sentHistory?.length || 0} · exportaciones {item.exportHistory?.length || 0}
                        </small>
                      </div>
                      <div className="mini-actions">
                        <button className="button ghost" onClick={() => handleRegenerate(item.id)} disabled={isPending}>
                          Regenerar
                        </button>
                        <button className="button ghost" onClick={() => handleResend(item.id)} disabled={isPending || !recipientEmail}>
                          Reenviar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
