import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, copyFileSync } from 'fs';
import { resolve, join } from 'path';
import { spawnSync } from 'child_process';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const DATA_DIR = resolve(ROOT, 'data');
const OUTPUT_DIR = resolve(ROOT, 'output');
const LOCAL_EXPORTS_ROOT = 'C:\\output';
const ROOT_PROFILE_PATH = resolve(ROOT, 'config', 'profile.yml');
const ROOT_CV_PATH = resolve(ROOT, 'cv.md');
const WEB_STATE_PATH = resolve(DATA_DIR, 'career-web-state.json');
const CANDIDATES_DIR = resolve(DATA_DIR, 'candidates');
const BATCHES_DIR = resolve(OUTPUT_DIR, 'web-batches');
const DASHBOARD_DIR = resolve(ROOT, 'dashboard');
const SEARCH_PORTALS = ['LinkedIn', 'Computrabajo', 'Bumeran', 'Indeed', 'HiringRoom', 'ZonaJobs', 'Adecco', 'Randstad', 'Manpower', 'Jooble'];

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(CANDIDATES_DIR, { recursive: true });
mkdirSync(BATCHES_DIR, { recursive: true });

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function candidatePaths(candidateId) {
  const id = slugify(candidateId || 'candidate');
  const dir = resolve(CANDIDATES_DIR, id);
  return {
    id,
    dir,
    uploadsDir: resolve(dir, 'uploads'),
    profilePath: resolve(dir, 'profile.yml'),
    cvPath: resolve(dir, 'cv.md'),
    statePath: resolve(dir, 'state.json'),
  };
}

function defaultCandidateState() {
  return {
    profileConfirmed: false,
    searchCompleted: false,
    generateCompleted: false,
    sendCompleted: false,
    jobs: [],
    selectedJobIds: [],
    batch: null,
    uploads: {},
    email: null,
    profileInputs: {},
    portalStats: {},
    searchHistory: [],
    batchHistory: [],
  };
}

function defaultPortalStat() {
  return {
    searches: 0,
    results: 0,
    selected: 0,
    generated: 0,
    lastSeenAt: null,
  };
}

function normalizePortalStats(portalStats = {}) {
  const normalized = {};
  for (const portal of SEARCH_PORTALS) {
    normalized[portal] = {
      ...defaultPortalStat(),
      ...(portalStats[portal] || {}),
    };
  }
  return normalized;
}

function trimHistory(items = [], limit = 12) {
  return items.slice(0, limit);
}

function defaultProfile(candidateName = 'Nuevo Candidato') {
  const name = candidateName.trim() || 'Nuevo Candidato';
  return {
    candidate: {
      full_name: name,
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      portfolio_url: '',
      github: '',
      twitter: '',
    },
    target_roles: {
      primary: ['Analista de Compras', 'Analista de Logistica', 'Administrativa'],
      archetypes: [],
    },
    narrative: {
      headline: '',
      exit_story: '',
      superpowers: [],
      proof_points: [],
    },
    compensation: {
      target_range: '',
      currency: 'ARS',
      minimum: '',
      location_flexibility: '',
    },
    location: {
      country: 'Argentina',
      city: 'Mendoza',
      timezone: 'ART',
      visa_status: 'No aplica',
      onsite_availability: '',
    },
  };
}

function loadYaml(path, fallback = {}) {
  if (!existsSync(path)) return fallback;
  return yaml.load(readFileSync(path, 'utf8')) || fallback;
}

function saveYaml(path, data) {
  writeFileSync(path, yaml.dump(data, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  }), 'utf8');
}

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function saveJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2), 'utf8');
}

function ensureCandidateDir(candidateId, candidateName) {
  const paths = candidatePaths(candidateId);
  mkdirSync(paths.dir, { recursive: true });
  mkdirSync(paths.uploadsDir, { recursive: true });

  if (!existsSync(paths.profilePath)) {
    saveYaml(paths.profilePath, defaultProfile(candidateName || candidateId));
  }
  if (!existsSync(paths.cvPath)) {
    writeFileSync(paths.cvPath, '', 'utf8');
  }
  if (!existsSync(paths.statePath)) {
    saveJson(paths.statePath, defaultCandidateState());
  }
  return paths;
}

function ensureInitialCandidate() {
  const webState = loadWebState();
  if (readdirSync(CANDIDATES_DIR).some(name => statSync(resolve(CANDIDATES_DIR, name)).isDirectory())) {
    if (!webState.activeCandidateId) {
      const first = listCandidates()[0];
      saveWebState({ ...webState, activeCandidateId: first?.id || null });
    }
    return;
  }

  let seedName = 'sample-candidate';
  let seedLabel = 'Sample Candidate';
  if (existsSync(ROOT_PROFILE_PATH)) {
    const profile = loadYaml(ROOT_PROFILE_PATH, {});
    const fullName = profile.candidate?.full_name?.trim();
    if (fullName) {
      seedLabel = fullName;
      seedName = slugify(fullName);
    }
  }

  const paths = ensureCandidateDir(seedName, seedLabel);
  if (existsSync(ROOT_PROFILE_PATH) && !existsSync(paths.profilePath + '.migrated')) {
    copyFileSync(ROOT_PROFILE_PATH, paths.profilePath);
  }
  if (existsSync(ROOT_CV_PATH)) {
    copyFileSync(ROOT_CV_PATH, paths.cvPath);
  }
  saveWebState({ ...webState, activeCandidateId: paths.id });
}

function loadWebState() {
  return loadJson(WEB_STATE_PATH, { activeCandidateId: null });
}

function saveWebState(nextState) {
  saveJson(WEB_STATE_PATH, nextState);
}

export function listCandidates() {
  ensureInitialCandidate();
  return readdirSync(CANDIDATES_DIR)
    .filter(name => statSync(resolve(CANDIDATES_DIR, name)).isDirectory())
    .map(id => {
      const paths = candidatePaths(id);
      const profile = loadYaml(paths.profilePath, defaultProfile(id));
      const state = loadJson(paths.statePath, defaultCandidateState());
      return {
        id,
        name: profile.candidate?.full_name || id,
        email: profile.candidate?.email || '',
        linkedin: profile.candidate?.linkedin || '',
        profileConfirmed: !!state.profileConfirmed,
        searchCompleted: !!state.searchCompleted,
        generateCompleted: !!state.generateCompleted,
        sendCompleted: !!state.sendCompleted,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function createCandidate(candidateName) {
  const id = slugify(candidateName || `candidate-${Date.now()}`);
  const paths = ensureCandidateDir(id, candidateName || id);
  const webState = loadWebState();
  saveWebState({ ...webState, activeCandidateId: id });
  return { id, paths };
}

export function selectCandidate(candidateId) {
  const paths = ensureCandidateDir(candidateId, candidateId);
  const webState = loadWebState();
  saveWebState({ ...webState, activeCandidateId: paths.id });
  return paths.id;
}

export function getActiveCandidateId() {
  ensureInitialCandidate();
  const webState = loadWebState();
  if (!webState.activeCandidateId) {
    const first = listCandidates()[0];
    if (first) {
      saveWebState({ ...webState, activeCandidateId: first.id });
      return first.id;
    }
  }
  return webState.activeCandidateId;
}

export function loadProfile(candidateId = getActiveCandidateId()) {
  const paths = ensureCandidateDir(candidateId, candidateId);
  return loadYaml(paths.profilePath, defaultProfile(candidateId));
}

export function saveProfile(profile, candidateId = getActiveCandidateId()) {
  const paths = ensureCandidateDir(candidateId, profile.candidate?.full_name || candidateId);
  saveYaml(paths.profilePath, profile);
}

export function loadCvText(candidateId = getActiveCandidateId()) {
  const paths = ensureCandidateDir(candidateId, candidateId);
  return existsSync(paths.cvPath) ? readFileSync(paths.cvPath, 'utf8') : '';
}

export function saveCvText(text, candidateId = getActiveCandidateId()) {
  const paths = ensureCandidateDir(candidateId, candidateId);
  writeFileSync(paths.cvPath, text, 'utf8');
}

export function loadState(candidateId = getActiveCandidateId()) {
  const paths = ensureCandidateDir(candidateId, candidateId);
  const state = loadJson(paths.statePath, defaultCandidateState());
  return {
    ...defaultCandidateState(),
    ...state,
    profileInputs: normalizeProfileInputs(state.profileInputs || {}),
    portalStats: normalizePortalStats(state.portalStats || {}),
    searchHistory: Array.isArray(state.searchHistory) ? state.searchHistory : [],
    batchHistory: Array.isArray(state.batchHistory) ? state.batchHistory : [],
  };
}

export function saveState(nextState, candidateId = getActiveCandidateId()) {
  const paths = ensureCandidateDir(candidateId, candidateId);
  saveJson(paths.statePath, {
    ...nextState,
    searchHistory: trimHistory(nextState.searchHistory || []),
    batchHistory: trimHistory(nextState.batchHistory || []),
  });
}

export function getActiveCandidateSnapshot() {
  const candidateId = getActiveCandidateId();
  return {
    activeCandidateId: candidateId,
    candidates: listCandidates(),
    profile: loadProfile(candidateId),
    state: loadState(candidateId),
    analysis: analyzeCandidateProfile(candidateId),
    suggestedPortals: suggestPortalsForProfile(candidateId),
    tools: getToolingStatus(),
  };
}

function defaultSearchPreferences() {
  return {
    enabledPortals: [...SEARCH_PORTALS],
    searchMode: 'ambos',
    searchLocation: '',
    requiredKeywords: '',
    excludedKeywords: '',
  };
}

function normalizeProfileInputs(profileInputs = {}) {
  const searchPreferences = defaultSearchPreferences();
  const enabledPortals = Array.isArray(profileInputs.enabledPortals) && profileInputs.enabledPortals.length > 0
    ? profileInputs.enabledPortals.filter(portal => SEARCH_PORTALS.includes(portal))
    : searchPreferences.enabledPortals;

  return {
    ...searchPreferences,
    ...profileInputs,
    enabledPortals,
  };
}

export function getToolingStatus() {
  const goCheck = spawnSync('go', ['version'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  const goInstalled = goCheck.status === 0;
  const goVersion = goInstalled
    ? (goCheck.stdout || goCheck.stderr).trim()
    : '';

  return {
    dashboard: {
      available: existsSync(DASHBOARD_DIR),
      goInstalled,
      goVersion,
      launchBlockedReason: goInstalled
        ? ''
        : 'Para abrir el dashboard en terminal hace falta instalar Go 1.21 o superior.',
    },
  };
}

export function saveUploadedCv(fileName, buffer, candidateId = getActiveCandidateId()) {
  const paths = ensureCandidateDir(candidateId, candidateId);
  const safeName = `${Date.now()}-${slugify(fileName.replace(/\.[^.]+$/, ''))}${fileName.match(/\.[^.]+$/)?.[0] || ''}`;
  const fullPath = resolve(paths.uploadsDir, safeName);
  writeFileSync(fullPath, buffer);
  return fullPath;
}

function parseListBlock(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- '))
    .map(line => line.replace(/^- /, '').trim());
}

function extractSection(markdown, heading) {
  const regex = new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
  return markdown.match(regex)?.[1]?.trim() || '';
}

export function parseCvMarkdown(markdown) {
  const summary = extractSection(markdown, 'Summary') || extractSection(markdown, 'Resumen');
  const skills = parseListBlock(extractSection(markdown, 'Skills') || extractSection(markdown, 'Competencias'));
  const certifications = parseListBlock(extractSection(markdown, 'Certifications') || extractSection(markdown, 'Certificaciones'));

  const experienceSection = extractSection(markdown, 'Experience') || extractSection(markdown, 'Experiencia');
  const experience = [];
  for (const chunk of experienceSection.split('\n### ').filter(Boolean)) {
    const lines = chunk.split('\n').filter(Boolean);
    const company = lines[0].replace(/^### /, '').trim();
    const roleLine = lines.find(line => line.startsWith('**')) || '';
    const role = roleLine.replace(/\*\*/g, '').trim();
    const metaIndex = lines.indexOf(roleLine);
    const meta = metaIndex >= 0 ? lines[metaIndex + 1] || '' : '';
    const bullets = lines.filter(line => line.trim().startsWith('- ')).map(line => line.replace(/^- /, '').trim());
    if (company) experience.push({ company, role, meta, bullets });
  }

  const educationSection = extractSection(markdown, 'Education') || extractSection(markdown, 'Formacion');
  const education = [];
  for (const chunk of educationSection.split('\n### ').filter(Boolean)) {
    const lines = chunk.split('\n').filter(Boolean);
    const institution = lines[0].replace(/^### /, '').trim();
    const degree = (lines.find(line => line.startsWith('**')) || '').replace(/\*\*/g, '').trim();
    const year = lines.find(line => /^\d{4}/.test(line.trim())) || '';
    if (institution) education.push({ institution, degree, year });
  }

  return { summary, skills, certifications, experience, education };
}

export function analyzeCandidateProfile(candidateId = getActiveCandidateId()) {
  const profile = loadProfile(candidateId);
  const cvText = loadCvText(candidateId);
  const state = loadState(candidateId);
  const missing = [];

  const candidate = profile.candidate || {};
  const location = profile.location || {};
  const compensation = profile.compensation || {};
  const targets = profile.target_roles || {};
  const profileInputs = state.profileInputs || {};

  if (!candidate.full_name) missing.push({ field: 'candidate.full_name', label: 'Nombre completo' });
  if (!candidate.email) missing.push({ field: 'candidate.email', label: 'Email' });
  if (!candidate.phone) missing.push({ field: 'candidate.phone', label: 'Telefono' });
  if (!candidate.linkedin) missing.push({ field: 'candidate.linkedin', label: 'Link de LinkedIn' });
  if (!location.city || !location.country) missing.push({ field: 'location', label: 'Lugar de trabajo / ubicacion base' });
  if (!targets.primary || targets.primary.length === 0) missing.push({ field: 'target_roles.primary', label: 'Roles objetivo' });
  if (!compensation.minimum) missing.push({ field: 'compensation.minimum', label: 'Remuneracion minima deseada' });
  if (!compensation.location_flexibility) missing.push({ field: 'compensation.location_flexibility', label: 'Modalidad / disponibilidad geografica' });
  if (!cvText || cvText.trim().length < 300) missing.push({ field: 'cv', label: 'CV cargado o suficientemente completo' });
  if (!profileInputs.englishLevel) missing.push({ field: 'profileInputs.englishLevel', label: 'Nivel de ingles' });
  if (!profileInputs.excelLevel) missing.push({ field: 'profileInputs.excelLevel', label: 'Nivel de Excel' });
  if (!profileInputs.erpTools) missing.push({ field: 'profileInputs.erpTools', label: 'ERP utilizados' });
  if (!profileInputs.mobility) missing.push({ field: 'profileInputs.mobility', label: 'Movilidad / licencia / pasaporte' });
  if (!profileInputs.restrictions) missing.push({ field: 'profileInputs.restrictions', label: 'Restricciones horarias o condiciones a evitar' });

  return {
    complete: missing.length === 0,
    missing,
    recommendations: [
      'Pretension salarial en mano',
      'Modalidad aceptable: presencial, hibrida, remota',
      'Zonas aceptables fuera de Mendoza',
      'Nivel de ingles',
      'Nivel de Excel',
      'ERP utilizados',
      'Movilidad propia, licencia y pasaporte',
      'Restricciones como domingos o nocturnidad',
    ],
    candidate,
    location,
    compensation,
    targets,
    profileInputs,
  };
}

function inferPortal(url) {
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('computrabajo.com')) return 'Computrabajo';
  if (url.includes('indeed.com')) return 'Indeed';
  if (url.includes('hiringroom.com')) return 'HiringRoom';
  if (url.includes('bumeran.com')) return 'Bumeran';
  if (url.includes('zonajobs.com.ar')) return 'ZonaJobs';
  if (url.includes('adecco.com/es-ar')) return 'Adecco';
  if (url.includes('randstad.com.ar')) return 'Randstad';
  if (url.includes('manpowergroup.com.ar')) return 'Manpower';
  if (url.includes('jooble.org')) return 'Jooble';
  return 'Web';
}

function inferCompanyFromTitle(title, url) {
  const patterns = [
    /^(.+?)\s+\|\s+(.+)$/,
    /^(.+?)\s+@\s+(.+)$/,
    /^(.+?)\s+-\s+(.+)$/,
    /^(.+?)\s+en\s+(.+)$/i,
  ];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return { title: match[1].trim(), company: match[2].trim() };
  }
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const hostPart = hostname.split('.')[0];
    return { title, company: hostPart.charAt(0).toUpperCase() + hostPart.slice(1) };
  } catch {
    return { title, company: 'Empresa' };
  }
}

function stripHtml(text) {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSearchUrl(rawUrl) {
  try {
    const decoded = rawUrl.replace(/&amp;/g, '&');
    const url = new URL(decoded, 'https://html.duckduckgo.com');
    const target = url.searchParams.get('uddg');
    return target ? decodeURIComponent(target) : url.toString();
  } catch {
    return rawUrl;
  }
}

function parseDuckDuckGoResults(html) {
  const links = [];
  const linkRegex = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkRegex)) {
    links.push({
      url: normalizeSearchUrl(match[1]),
      rawTitle: stripHtml(match[2]),
    });
  }

  const snippets = [];
  const snippetRegex = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(snippetRegex)) {
    snippets.push(stripHtml(match[1]));
  }

  const results = [];
  const seen = new Set();
  for (let index = 0; index < links.length; index += 1) {
    const link = links[index];
    if (!link.url.startsWith('http') || seen.has(link.url) || !link.rawTitle) continue;
    const parsed = inferCompanyFromTitle(link.rawTitle, link.url);
    results.push({
      id: `${slugify(parsed.company)}-${slugify(parsed.title)}-${index + 1}`,
      title: parsed.title,
      company: parsed.company,
      url: link.url,
      portal: inferPortal(link.url),
      snippet: snippets[index] || '',
    });
    seen.add(link.url);
  }
  return results;
}

function keywordScore(text, terms) {
  const lower = text.toLowerCase();
  return terms.reduce((score, term) => score + (lower.includes(term.toLowerCase()) ? 1 : 0), 0);
}

function parseCommaTerms(value) {
  return String(value || '')
    .split(/[,;\n]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function portalLearningScore(portalStats, portal) {
  const stat = normalizePortalStats(portalStats || {})[portal] || defaultPortalStat();
  return (stat.selected * 4) + (stat.generated * 6) + Math.min(stat.results, 12);
}

export function updatePortalStatsFromJobs(currentStats = {}, jobs = [], field = 'results') {
  const next = normalizePortalStats(currentStats);
  const now = new Date().toISOString();
  const counts = new Map();

  for (const job of jobs) {
    const portal = job.portal;
    if (!SEARCH_PORTALS.includes(portal)) continue;
    counts.set(portal, (counts.get(portal) || 0) + 1);
  }

  for (const [portal, count] of counts.entries()) {
    next[portal] = {
      ...next[portal],
      [field]: (next[portal]?.[field] || 0) + count,
      lastSeenAt: now,
    };
  }

  return next;
}

function summarizeJob(job) {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    portal: job.portal,
    url: job.url,
    score: job.score || 0,
    snippet: job.snippet || '',
    matchReasons: job.matchReasons || [],
  };
}

export function buildSearchHistoryEntry(profileInputs, jobs) {
  return {
    id: `search-${Date.now()}`,
    searchedAt: new Date().toISOString(),
    preferences: {
      enabledPortals: [...(profileInputs.enabledPortals || [])],
      searchMode: profileInputs.searchMode || 'ambos',
      searchLocation: profileInputs.searchLocation || '',
      requiredKeywords: profileInputs.requiredKeywords || '',
      excludedKeywords: profileInputs.excludedKeywords || '',
    },
    resultsCount: jobs.length,
    portalsWithResults: [...new Set(jobs.map(job => job.portal))],
    topJobs: jobs.slice(0, 8).map(summarizeJob),
  };
}

export function buildBatchHistoryEntry(batch, jobs) {
  return {
    id: batch.batchId,
    createdAt: new Date().toISOString(),
    filesCount: batch.files.length * 3,
    jobCount: jobs.length,
    jobs: jobs.map(summarizeJob),
    sentHistory: [],
    exportHistory: [],
  };
}

export function upsertBatchHistory(batchHistory = [], entry) {
  const filtered = batchHistory.filter(item => item.id !== entry.id);
  return trimHistory([entry, ...filtered]);
}

export function patchBatchHistory(batchHistory = [], batchId, updater) {
  return trimHistory(batchHistory.map(item => (
    item.id === batchId ? updater(item) : item
  )));
}

function buildPortalQueries(profile, profileInputs) {
  const normalizedInputs = normalizeProfileInputs(profileInputs);
  const city = normalizedInputs.searchLocation || profile.location?.city || 'Mendoza';
  const primaryRoles = (profile.target_roles?.primary || []).slice(0, 4);
  const searchMode = normalizedInputs.searchMode || 'ambos';
  const requiredKeywords = parseCommaTerms(normalizedInputs.requiredKeywords);
  const modeTerms = searchMode === 'remoto'
    ? ['remoto']
    : searchMode === 'presencial'
      ? ['presencial', 'onsite']
      : searchMode === 'hibrido'
        ? ['hibrido', 'hybrid']
        : ['presencial', 'hibrido', 'remoto'];
  const baseQueries = [
    { portal: 'LinkedIn', query: `site:ar.linkedin.com/jobs/view ${city} (${primaryRoles.join(' OR ')})` },
    { portal: 'Computrabajo', query: `site:ar.computrabajo.com/ofertas-de-trabajo ${city} compras OR logistica OR abastecimiento OR administrativo` },
    { portal: 'Computrabajo', query: `site:ar.computrabajo.com/trabajo-de-compras-en-${city.toLowerCase()}` },
    { portal: 'Bumeran', query: `site:bumeran.com.ar/empleos ${city} compras OR logistica OR abastecimiento` },
    { portal: 'Indeed', query: `site:ar.indeed.com/viewjob ${city} compras OR logistica OR abastecimiento` },
    { portal: 'HiringRoom', query: `site:hiringroom.com/jobs/get_vacancy ${city} compras OR logistica OR abastecimiento` },
    { portal: 'HiringRoom', query: `site:hiringroom.com/jobs ${city} compras OR logistica OR abastecimiento` },
    { portal: 'ZonaJobs', query: `site:zonajobs.com.ar/empleos ${city} compras OR logistica OR abastecimiento OR administrativo` },
    { portal: 'Adecco', query: `site:adecco.com/es-ar ${city} trabajo compras OR logistica OR administrativo` },
    { portal: 'Randstad', query: `site:randstad.com.ar/trabajos ${city} compras OR logistica OR administrativo` },
    { portal: 'Manpower', query: `site:manpowergroup.com.ar/oportunidades-de-trabajo ${city} compras OR logistica OR administrativo` },
    { portal: 'Jooble', query: `site:ar.jooble.org trabajo ${city} compras OR logistica OR administrativo` },
  ];
  const portalQueries = baseQueries
    .filter(item => normalizedInputs.enabledPortals.includes(item.portal))
    .map(item => ({
      ...item,
      query: `${item.query} ${requiredKeywords.join(' ')} ${modeTerms.join(' OR ')}`.trim(),
    }));

  const explicitTerms = [
    ...primaryRoles,
    normalizedInputs.erpTools,
    normalizedInputs.excelLevel,
    ...requiredKeywords,
    ...modeTerms,
    'compras',
    'logistica',
    'abastecimiento',
    'administrativo',
  ].filter(Boolean);

  return { portalQueries, explicitTerms, city, enabledPortals: normalizedInputs.enabledPortals };
}

function rankJobs(jobs, profile, profileInputs) {
  const normalizedInputs = normalizeProfileInputs(profileInputs);
  const portalStats = normalizedInputs.portalStats || {};
  const roleTerms = profile.target_roles?.primary || [];
  const hardSkills = [normalizedInputs.erpTools, normalizedInputs.excelLevel, 'sap', 'excel', 'erp'].filter(Boolean);
  const city = normalizedInputs.searchLocation || profile.location?.city || '';
  const negatives = (normalizedInputs.restrictions || '').split(/[,.;]/).map(item => item.trim().toLowerCase()).filter(Boolean);
  const excludedKeywords = parseCommaTerms(normalizedInputs.excludedKeywords).map(item => item.toLowerCase());
  const requiredKeywords = parseCommaTerms(normalizedInputs.requiredKeywords);
  const searchMode = normalizedInputs.searchMode || 'ambos';
  const modeTerms = searchMode === 'remoto'
    ? ['remoto']
    : searchMode === 'presencial'
      ? ['presencial', 'onsite']
      : searchMode === 'hibrido'
        ? ['hibrido', 'hybrid']
        : ['presencial', 'hibrido', 'remoto'];

  return jobs
    .map(job => {
      const haystack = `${job.title} ${job.company} ${job.snippet} ${job.portal}`;
      const lowerHaystack = haystack.toLowerCase();
      let score = 0;
      score += keywordScore(haystack, roleTerms) * 5;
      score += keywordScore(haystack, hardSkills) * 2;
      score += keywordScore(haystack, ['compras', 'abastecimiento', 'logistica', 'administrativo']) * 3;
      score += keywordScore(haystack, requiredKeywords) * 4;
      score += keywordScore(haystack, modeTerms) * 2;
      if (city && lowerHaystack.includes(city.toLowerCase())) score += 2;
      if (['HiringRoom', 'Computrabajo', 'ZonaJobs', 'Randstad'].includes(job.portal)) score += 2;
      score += portalLearningScore(portalStats, job.portal);
      if (negatives.some(term => lowerHaystack.includes(term))) score -= 6;
      if (excludedKeywords.some(term => lowerHaystack.includes(term))) score -= 10;
      return { ...job, score };
    })
    .filter(job => job.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function suggestPortalsForProfile(candidateId = getActiveCandidateId()) {
  const profile = loadProfile(candidateId);
  const state = loadState(candidateId);
  const profileInputs = normalizeProfileInputs(state.profileInputs || {});
  const enabled = new Set(profileInputs.enabledPortals || []);
  const portalStats = normalizePortalStats(state.portalStats || {});
  const city = `${profileInputs.searchLocation || profile.location?.city || ''} ${profile.location?.country || ''}`.toLowerCase();
  const roleTerms = [
    ...(profile.target_roles?.primary || []),
    profileInputs.requiredKeywords,
    profileInputs.erpTools,
  ].join(' ').toLowerCase();

  const suggestions = [];
  const addSuggestion = (portal, reason, priority = 1) => {
    suggestions.push({
      portal,
      reason,
      priority: priority + portalLearningScore(portalStats, portal),
      active: enabled.has(portal),
      stats: portalStats[portal],
    });
  };

  if (city.includes('argentina') || city.includes('mendoza') || city.includes('buenos aires')) {
    addSuggestion('ZonaJobs', 'Muy usado en Argentina para perfiles administrativos y corporativos.', 5);
    addSuggestion('Randstad', 'Suele publicar busquedas operativas, administrativas y logisticas.', 4);
    addSuggestion('Manpower', 'Aporta vacantes masivas y generalistas en Argentina.', 4);
    addSuggestion('Adecco', 'Suma oportunidades de staffing y perfiles de soporte.', 3);
  }

  if (/compras|abastecimiento|logistica|administrativ|supply/.test(roleTerms)) {
    addSuggestion('Computrabajo', 'Rinde bien para compras, logistica y administracion.', 5);
    addSuggestion('Indeed', 'Amplia la cobertura en puestos administrativos y operativos.', 4);
    addSuggestion('Jooble', 'Sirve para descubrir avisos agregados de otras bolsas.', 3);
  }

  addSuggestion('LinkedIn', 'Conviene mantenerlo por visibilidad y volumen.', 3);
  addSuggestion('HiringRoom', 'Ayuda a detectar formularios directos de empresas.', 3);

  const deduped = [];
  const seen = new Set();
  for (const item of suggestions.sort((a, b) => b.priority - a.priority || a.portal.localeCompare(b.portal))) {
    if (seen.has(item.portal)) continue;
    seen.add(item.portal);
    deduped.push(item);
  }
  return deduped;
}

export async function searchJobsForProfile(candidateId = getActiveCandidateId()) {
  const profile = loadProfile(candidateId);
  const state = loadState(candidateId);
  const profileInputs = {
    ...normalizeProfileInputs(state.profileInputs || {}),
    portalStats: state.portalStats || {},
  };
  const { portalQueries, explicitTerms, enabledPortals } = buildPortalQueries(profile, profileInputs);

  const aggregate = [];
  for (const item of portalQueries) {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(item.query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0',
        'accept-language': 'es-AR,es;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    });
    const html = await response.text();
    const results = parseDuckDuckGoResults(html)
      .map(result => ({ ...result, sourceQuery: item.query, portal: inferPortal(result.url) || item.portal }));
    aggregate.push(...results);
  }

  const unique = [];
  const seen = new Set();
  for (const job of rankJobs(aggregate, profile, profileInputs)) {
    const key = `${job.url}::${slugify(job.title)}`;
    if (seen.has(key)) continue;
    if (!enabledPortals.includes(job.portal)) continue;
    seen.add(key);
    unique.push({
      ...job,
      matchReasons: explicitTerms.filter(term => `${job.title} ${job.snippet}`.toLowerCase().includes(String(term).toLowerCase())).slice(0, 4),
    });
    if (unique.length >= 15) break;
  }
  return unique;
}

function candidateSlugFromProfile(profile, fallbackId) {
  const name = profile.candidate?.full_name || fallbackId || 'candidate';
  return slugify(name) || 'candidate';
}

function buildCompetencies(job, profile, parsedCv) {
  const base = [
    job.title,
    'Compras',
    'Logistica',
    'Proveedores',
    'Documentacion',
    'Excel',
    'ERP',
  ];
  return [...new Set([...base, ...parsedCv.skills.slice(0, 4)])].filter(Boolean).slice(0, 8);
}

function buildSummary(job, profile) {
  const headline = profile.narrative?.headline || 'Profesional administrativa y logistica';
  return `${headline}. Perfil orientado a ${job.title.toLowerCase()}, con experiencia transferible en administracion, seguimiento operativo, proveedores, documentacion, Excel y sistemas de gestion. Puede aportar orden, criterio y coordinacion a ${job.company}.`;
}

function renderJobHtml(job, profile, parsedCv) {
  const competencies = buildCompetencies(job, profile, parsedCv);
  const experience = parsedCv.experience.slice(0, 3).map(item => `
    <div class="job">
      <div class="job-header">
        <div class="job-company">${escapeHtml(item.company)}</div>
        <div class="job-period">${escapeHtml(item.meta)}</div>
      </div>
      <div class="job-role">${escapeHtml(item.role)}</div>
      <ul>
        ${item.bullets.slice(0, 3).map(bullet => `<li>${escapeHtml(bullet)}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  const education = parsedCv.education.map(item => `
    <div class="edu-item">
      <div class="edu-header">
        <div class="edu-title">${escapeHtml(item.degree)} <span class="edu-org">- ${escapeHtml(item.institution)}</span></div>
        <div class="edu-year">${escapeHtml(item.year)}</div>
      </div>
    </div>
  `).join('');

  const certifications = parsedCv.certifications.map(cert => `
    <div class="cert-item"><div class="cert-title">${escapeHtml(cert)}</div></div>
  `).join('');

  const skills = parsedCv.skills.slice(0, 12).map(skill => `<span class="skill-item">${escapeHtml(skill)}</span>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(profile.candidate?.full_name || 'CV')} - CV</title>
<style>
  @font-face { font-family: 'Space Grotesk'; src: url('./fonts/space-grotesk-latin.woff2') format('woff2'); font-weight: 300 700; font-style: normal; font-display: swap; }
  @font-face { font-family: 'DM Sans'; src: url('./fonts/dm-sans-latin.woff2') format('woff2'); font-weight: 100 1000; font-style: normal; font-display: swap; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'DM Sans', sans-serif; font-size: 11px; line-height: 1.5; color: #1a1a2e; background: #ffffff; }
  .page { width: 100%; max-width: 210mm; margin: 0 auto; padding: 2px 0; }
  .header { margin-bottom: 20px; }
  .header h1 { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; color: #1a1a2e; letter-spacing: -0.02em; margin-bottom: 6px; line-height: 1.1; }
  .header-gradient { height: 2px; background: linear-gradient(to right, hsl(187, 74%, 32%), hsl(270, 70%, 45%)); border-radius: 1px; margin-bottom: 10px; }
  .contact-row { display: flex; flex-wrap: wrap; gap: 8px 14px; font-size: 10.5px; line-height: 1.4; color: #555; }
  .contact-row a { color: #555; text-decoration: none; white-space: nowrap; }
  .contact-row .separator { color: #ccc; }
  .section { margin-bottom: 18px; }
  .section-title { font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: hsl(187, 74%, 32%); border-bottom: 1.5px solid #e2e2e2; padding-bottom: 4px; margin-bottom: 10px; line-height: 1.2; }
  .summary-text { font-size: 11px; line-height: 1.7; color: #2f2f2f; }
  .competencies-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .competency-tag { font-size: 10px; font-weight: 500; color: hsl(187, 74%, 28%); background: hsl(187, 40%, 95%); padding: 4px 10px; border-radius: 3px; border: 1px solid hsl(187, 40%, 88%); }
  .job { margin-bottom: 14px; break-inside: avoid; page-break-inside: avoid; }
  .job-header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
  .job-company { font-family: 'Space Grotesk', sans-serif; font-size: 12.5px; font-weight: 600; color: hsl(270, 70%, 45%); }
  .job-period { font-size: 10.5px; color: #777; white-space: nowrap; }
  .job-role { font-size: 11px; font-weight: 600; color: #333; margin-bottom: 6px; }
  .job ul { padding-left: 18px; margin-top: 6px; }
  .job li { font-size: 10.5px; line-height: 1.6; color: #333; margin-bottom: 4px; }
  .edu-item, .cert-item { margin-bottom: 8px; }
  .edu-header, .cert-item { display: flex; justify-content: space-between; gap: 12px; }
  .edu-title, .cert-title { font-weight: 600; font-size: 11px; color: #333; }
  .edu-org { color: hsl(270, 70%, 45%); font-weight: 500; }
  .edu-year { font-size: 10px; color: #777; white-space: nowrap; }
  .skills-grid { display: flex; flex-wrap: wrap; gap: 6px 14px; }
  .skill-item { font-size: 10.5px; color: #444; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>${escapeHtml(profile.candidate?.full_name || '')}</h1>
    <div class="header-gradient"></div>
    <div class="contact-row">
      <span>${escapeHtml(profile.candidate?.phone || '')}</span>
      <span class="separator">|</span>
      <span>${escapeHtml(profile.candidate?.email || '')}</span>
      <span class="separator">|</span>
      <a href="https://${escapeHtml(profile.candidate?.linkedin || '')}">${escapeHtml(profile.candidate?.linkedin || '')}</a>
      <span class="separator">|</span>
      <span>${escapeHtml(profile.candidate?.location || '')}</span>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Resumen Profesional</div>
    <div class="summary-text">${escapeHtml(buildSummary(job, profile))}</div>
  </div>
  <div class="section">
    <div class="section-title">Competencias Core</div>
    <div class="competencies-grid">
      ${competencies.map(item => `<span class="competency-tag">${escapeHtml(item)}</span>`).join('')}
    </div>
  </div>
  <div class="section">
    <div class="section-title">Experiencia Laboral</div>
    ${experience}
  </div>
  <div class="section">
    <div class="section-title">Formacion</div>
    ${education}
  </div>
  <div class="section">
    <div class="section-title">Certificaciones</div>
    ${certifications}
  </div>
  <div class="section">
    <div class="section-title">Competencias</div>
    <div class="skills-grid">${skills}</div>
  </div>
</div>
</body>
</html>`;
}

function renderPostulationMarkdown(job, profile) {
  return `# Postulacion - ${job.company}

Fecha: ${new Date().toISOString().slice(0, 10)}
Rol: ${job.title}
Empresa: ${job.company}
Base: generado desde workflow web local

## Link de postulacion

- ${job.portal}: ${job.url}

## Portal de origen

- ${job.portal}

## Version breve

Hola, me interesa postularme a la vacante de ${job.title} en ${job.company}.

Soy ${profile.candidate?.full_name || ''}, con experiencia transferible en administracion, logistica, proveedores, documentacion, Excel y ERP. Considero que puedo aportar orden, seguimiento y capacidad operativa al puesto.

Quedo a disposicion.

${profile.candidate?.full_name || ''}
${profile.candidate?.phone || ''}
${profile.candidate?.email || ''}
${profile.candidate?.linkedin || ''}

## Mail

Hola,

Les comparto mi postulacion para la vacante de ${job.title} en ${job.company}.

Soy ${profile.candidate?.full_name || ''}, con experiencia en administracion, seguimiento de procesos, proveedores, documentacion, Excel y sistemas de gestion. Mi perfil combina orden administrativo, capacidad de coordinacion y foco en la continuidad operativa.

Me interesa esta oportunidad porque esta alineada con mi experiencia transferible y con el tipo de funciones donde puedo aportar valor desde el primer dia.

Adjunto mi CV para su consideracion. Quedo a disposicion para ampliar informacion y coordinar una entrevista.

Saludos,

${profile.candidate?.full_name || ''}
${profile.candidate?.phone || ''}
${profile.candidate?.email || ''}
${profile.candidate?.linkedin || ''}
`;
}

export function generateBatchForJobs(jobs, candidateId = getActiveCandidateId()) {
  const profile = loadProfile(candidateId);
  const cvText = loadCvText(candidateId);
  const parsedCv = parseCvMarkdown(cvText);
  const candidateSlug = candidateSlugFromProfile(profile, candidateId);
  const date = new Date().toISOString().slice(0, 10);
  const batchId = `${candidateSlug}-${date}-${Date.now()}`;
  const batchDir = resolve(BATCHES_DIR, batchId);
  mkdirSync(batchDir, { recursive: true });

  const generated = [];
  for (const job of jobs) {
    const jobSlug = slugify(`${job.company}-${job.title}`) || 'job';
    const mdPath = resolve(batchDir, `${candidateSlug}-${jobSlug}-postulacion.md`);
    const htmlPath = resolve(batchDir, `${candidateSlug}-${jobSlug}-tailored-cv.html`);
    const pdfPath = resolve(batchDir, `cv-${candidateSlug}-${jobSlug}-${date}.pdf`);

    writeFileSync(mdPath, renderPostulationMarkdown(job, profile), 'utf8');
    writeFileSync(htmlPath, renderJobHtml(job, profile, parsedCv), 'utf8');

    const result = spawnSync('node', ['generate-pdf.mjs', htmlPath, pdfPath, '--format=a4'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || `Failed to generate PDF for ${job.title}`);
    }

    generated.push({
      job,
      mdPath,
      htmlPath,
      pdfPath,
      mdName: join('output', 'web-batches', batchId, `${candidateSlug}-${jobSlug}-postulacion.md`),
      htmlName: join('output', 'web-batches', batchId, `${candidateSlug}-${jobSlug}-tailored-cv.html`),
      pdfName: join('output', 'web-batches', batchId, `cv-${candidateSlug}-${jobSlug}-${date}.pdf`),
    });
  }

  const manifest = {
    batchId,
    createdAt: new Date().toISOString(),
    candidateSlug,
    candidateId,
    files: generated.map(item => ({
      title: item.job.title,
      company: item.job.company,
      mdName: item.mdName,
      htmlName: item.htmlName,
      pdfName: item.pdfName,
      url: item.job.url,
    })),
  };
  const manifestPath = resolve(batchDir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  return { batchId, batchDir, manifestPath, files: generated };
}

export function listBatchFiles(batchId) {
  const batchDir = resolve(BATCHES_DIR, batchId);
  if (!existsSync(batchDir)) return [];
  return readdirSync(batchDir)
    .map(name => resolve(batchDir, name))
    .filter(file => statSync(file).isFile() && !file.endsWith('manifest.json'));
}

export function sendBatchEmail({ batchId, to }) {
  const batchDir = resolve(BATCHES_DIR, batchId);
  if (!existsSync(batchDir)) throw new Error(`Batch not found: ${batchId}`);

  const attachments = listBatchFiles(batchId);
  if (attachments.length === 0) throw new Error('No attachments found in generated batch.');

  const manifestPath = resolve(batchDir, 'manifest.json');
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : { candidateSlug: 'candidate' };

  const subject = `Paquete de postulaciones - ${manifest.candidateSlug}`;
  const body = [
    'Hola,',
    '',
    'Te envio los archivos generados desde la web local de postulaciones.',
    'Incluye los textos de postulacion y los CVs en PDF para revisar y completar manualmente.',
    '',
    'Saludos,',
  ].join('\r\n');

  const escapedAttachments = attachments.map(file => `'${file.replace(/'/g, "''")}'`).join(', ');
  const psScript = `
$ErrorActionPreference = 'Stop'
$outlook = New-Object -ComObject Outlook.Application
$mail = $outlook.CreateItem(0)
$mail.To = '${to.replace(/'/g, "''")}'
$mail.Subject = '${subject.replace(/'/g, "''")}'
$mail.Body = '${body.replace(/'/g, "''")}'
$attachments = @(${escapedAttachments})
foreach ($attachment in $attachments) {
  $null = $mail.Attachments.Add($attachment)
}
$mail.Send()
Write-Output 'EMAIL_SENT'
`;

  const result = spawnSync('powershell', ['-NoProfile', '-Command', psScript], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'Outlook send failed.');
  }
  return { status: result.stdout.trim(), attachments: attachments.length };
}

export function exportBatchToLocalFolder({ batchId, candidateId = getActiveCandidateId() }) {
  const batchDir = resolve(BATCHES_DIR, batchId);
  if (!existsSync(batchDir)) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  const manifestPath = resolve(batchDir, 'manifest.json');
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : { candidateSlug: slugify(candidateId), batchId };

  const exportDir = resolve(LOCAL_EXPORTS_ROOT, manifest.candidateSlug || slugify(candidateId), batchId);
  mkdirSync(exportDir, { recursive: true });

  const files = readdirSync(batchDir)
    .map(name => ({ name, source: resolve(batchDir, name) }))
    .filter(entry => statSync(entry.source).isFile());

  for (const file of files) {
    copyFileSync(file.source, resolve(exportDir, file.name));
  }

  return {
    exportedTo: exportDir,
    files: files.length,
  };
}

export function launchDashboardTui() {
  const tooling = getToolingStatus();
  if (!tooling.dashboard.available) {
    throw new Error('No encontre la carpeta dashboard dentro del proyecto.');
  }
  if (!tooling.dashboard.goInstalled) {
    throw new Error(tooling.dashboard.launchBlockedReason);
  }

  const psCommand = [
    `$host.ui.RawUI.WindowTitle = 'Career Ops Dashboard'`,
    `Set-Location '${DASHBOARD_DIR.replace(/'/g, "''")}'`,
    `go run . --path ..`,
  ].join('; ');

  const result = spawnSync('powershell', [
    '-NoProfile',
    '-Command',
    `Start-Process powershell -ArgumentList '-NoExit','-Command',"${psCommand.replace(/"/g, '\\"')}"`,
  ], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || 'No pude abrir el dashboard en una terminal nueva.');
  }

  return {
    status: 'launched',
    message: 'Dashboard abierto en una nueva ventana de terminal.',
  };
}
