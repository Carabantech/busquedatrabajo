#!/usr/bin/env node

/**
 * scan.mjs - Zero-token portal scanner
 *
 * Fetches Greenhouse, Ashby, and Lever APIs directly, optionally augments
 * discovery through configured search_queries, applies title filters from
 * portals.yml, deduplicates against existing history, and appends new offers
 * to pipeline.md + scan-history.tsv.
 *
 * Usage:
 *   node scan.mjs
 *   node scan.mjs --dry-run
 *   node scan.mjs --company Cohere
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';

const parseYaml = yaml.load;

const PORTALS_PATH = 'portals.yml';
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const PIPELINE_PATH = 'data/pipeline.md';
const APPLICATIONS_PATH = 'data/applications.md';

mkdirSync('data', { recursive: true });

const CONCURRENCY = 10;
const FETCH_TIMEOUT_MS = 10_000;
const SEARCH_RESULTS_PER_QUERY = 8;
const SEARCH_CONCURRENCY = 4;
const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9,es;q=0.8',
};

function detectApi(company) {
  if (company.api && company.api.includes('greenhouse')) {
    return { type: 'greenhouse', url: company.api };
  }

  const url = company.careers_url || '';

  const ashbyMatch = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
  if (ashbyMatch) {
    return {
      type: 'ashby',
      url: `https://api.ashbyhq.com/posting-api/job-board/${ashbyMatch[1]}?includeCompensation=true`,
    };
  }

  const leverMatch = url.match(/jobs\.lever\.co\/([^/?#]+)/);
  if (leverMatch) {
    return {
      type: 'lever',
      url: `https://api.lever.co/v0/postings/${leverMatch[1]}`,
    };
  }

  const greenhouseMatch = url.match(/job-boards(?:\.eu)?\.greenhouse\.io\/([^/?#]+)/);
  if (greenhouseMatch && !company.api) {
    return {
      type: 'greenhouse',
      url: `https://boards-api.greenhouse.io/v1/boards/${greenhouseMatch[1]}/jobs`,
    };
  }

  return null;
}

function parseGreenhouse(json, companyName) {
  const jobs = json.jobs || [];
  return jobs.map(job => ({
    title: job.title || '',
    url: job.absolute_url || '',
    company: companyName,
    location: job.location?.name || '',
  }));
}

function parseAshby(json, companyName) {
  const jobs = json.jobs || [];
  return jobs.map(job => ({
    title: job.title || '',
    url: job.jobUrl || '',
    company: companyName,
    location: job.location || '',
  }));
}

function parseLever(json, companyName) {
  if (!Array.isArray(json)) return [];
  return json.map(job => ({
    title: job.text || '',
    url: job.hostedUrl || '',
    company: companyName,
    location: job.categories?.location || '',
  }));
}

const PARSERS = {
  greenhouse: parseGreenhouse,
  ashby: parseAshby,
  lever: parseLever,
};

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal, headers: DEFAULT_HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal, headers: DEFAULT_HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function buildTitleFilter(titleFilter) {
  const positive = (titleFilter?.positive || []).map(keyword => keyword.toLowerCase());
  const negative = (titleFilter?.negative || []).map(keyword => keyword.toLowerCase());

  return title => {
    const lower = title.toLowerCase();
    const hasPositive = positive.length === 0 || positive.some(keyword => lower.includes(keyword));
    const hasNegative = negative.some(keyword => lower.includes(keyword));
    return hasPositive && !hasNegative;
  };
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(text) {
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
}

function normalizeSearchResultUrl(rawUrl) {
  if (!rawUrl) return '';
  const decoded = decodeHtmlEntities(rawUrl);

  try {
    const url = new URL(decoded, 'https://html.duckduckgo.com');
    const target = url.searchParams.get('uddg');
    return target ? decodeURIComponent(target) : url.toString();
  } catch {
    return decoded;
  }
}

function inferCompanyFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const first = host.split('.')[0] || host;
    return first
      .split(/[-_]/g)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return 'Unknown';
  }
}

function extractTitleAndCompany(rawTitle, url) {
  const title = rawTitle.replace(/\s+/g, ' ').trim();
  const patterns = [
    /^(.+?)\s+@\s+(.+)$/,
    /^(.+?)\s+\|\s+(.+)$/,
    /^(.+?)\s+[—–-]\s+(.+)$/,
    /^(.+?)\s+at\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return {
        title: match[1].trim(),
        company: match[2].trim(),
      };
    }
  }

  return {
    title,
    company: inferCompanyFromUrl(url),
  };
}

function parseDuckDuckGoResults(html, queryName) {
  const results = [];
  const seen = new Set();
  const regex = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(regex)) {
    const url = normalizeSearchResultUrl(match[1]);
    if (!url.startsWith('http') || seen.has(url)) continue;

    const rawTitle = stripHtml(match[2]);
    if (!rawTitle) continue;

    const parsed = extractTitleAndCompany(rawTitle, url);
    results.push({
      title: parsed.title,
      url,
      company: parsed.company,
      location: '',
      source: queryName,
    });
    seen.add(url);

    if (results.length >= SEARCH_RESULTS_PER_QUERY) break;
  }

  return results;
}

function loadSeenUrls() {
  const seen = new Set();

  if (existsSync(SCAN_HISTORY_PATH)) {
    const lines = readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n');
    for (const line of lines.slice(1)) {
      const url = line.split('\t')[0];
      if (url) seen.add(url);
    }
  }

  if (existsSync(PIPELINE_PATH)) {
    const text = readFileSync(PIPELINE_PATH, 'utf-8');
    for (const match of text.matchAll(/- \[[ x]\] (https?:\/\/\S+)/g)) {
      seen.add(match[1]);
    }
  }

  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(match[0]);
    }
  }

  return seen;
}

function loadSeenCompanyRoles() {
  const seen = new Set();

  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/\|[^|]+\|[^|]+\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g)) {
      const company = match[1].trim().toLowerCase();
      const role = match[2].trim().toLowerCase();
      if (company && role && company !== 'company') {
        seen.add(`${company}::${role}`);
      }
    }
  }

  return seen;
}

function appendToPipeline(offers) {
  if (offers.length === 0) return;

  if (!existsSync(PIPELINE_PATH)) {
    writeFileSync(PIPELINE_PATH, '# Pipeline\n\n## Pendientes\n\n## Procesadas\n', 'utf-8');
  }

  let text = readFileSync(PIPELINE_PATH, 'utf-8');
  const marker = '## Pendientes';
  const idx = text.indexOf(marker);

  if (idx === -1) {
    const processedIdx = text.indexOf('## Procesadas');
    const insertAt = processedIdx === -1 ? text.length : processedIdx;
    const block = `\n${marker}\n\n${offers.map(offer => `- [ ] ${offer.url} | ${offer.company} | ${offer.title}`).join('\n')}\n\n`;
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  } else {
    const afterMarker = idx + marker.length;
    const nextSection = text.indexOf('\n## ', afterMarker);
    const insertAt = nextSection === -1 ? text.length : nextSection;
    const block = `\n${offers.map(offer => `- [ ] ${offer.url} | ${offer.company} | ${offer.title}`).join('\n')}\n`;
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  }

  writeFileSync(PIPELINE_PATH, text, 'utf-8');
}

function appendToScanHistory(offers, date) {
  if (!existsSync(SCAN_HISTORY_PATH)) {
    writeFileSync(SCAN_HISTORY_PATH, 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n', 'utf-8');
  }

  const lines = offers
    .map(offer => `${offer.url}\t${date}\t${offer.source}\t${offer.title}\t${offer.company}\tadded`)
    .join('\n');

  appendFileSync(SCAN_HISTORY_PATH, `${lines}\n`, 'utf-8');
}

async function parallelFetch(tasks, limit) {
  const results = [];
  let i = 0;

  async function next() {
    while (i < tasks.length) {
      const task = tasks[i++];
      results.push(await task());
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => next());
  await Promise.all(workers);
  return results;
}

function acceptJob(job, titleFilter, seenUrls, seenCompanyRoles) {
  if (!titleFilter(job.title)) return 'filtered';
  if (seenUrls.has(job.url)) return 'duplicate';

  const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
  if (seenCompanyRoles.has(key)) return 'duplicate';

  seenUrls.add(job.url);
  seenCompanyRoles.add(key);
  return 'accepted';
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const companyFlag = args.indexOf('--company');
  const filterCompany = companyFlag !== -1 ? args[companyFlag + 1]?.toLowerCase() : null;

  if (!existsSync(PORTALS_PATH)) {
    console.error('Error: portals.yml not found. Run onboarding first.');
    process.exit(1);
  }

  const config = parseYaml(readFileSync(PORTALS_PATH, 'utf-8'));
  const companies = config.tracked_companies || [];
  const searchQueries = (config.search_queries || []).filter(query => query.enabled !== false);
  const titleFilter = buildTitleFilter(config.title_filter);

  const targets = companies
    .filter(company => company.enabled !== false)
    .filter(company => !filterCompany || company.name.toLowerCase().includes(filterCompany))
    .map(company => ({ ...company, _api: detectApi(company) }))
    .filter(company => company._api !== null);

  const skippedCount = companies.filter(company => company.enabled !== false).length - targets.length;

  console.log(`Scanning ${targets.length} companies via API (${skippedCount} skipped - no API detected)`);
  console.log(`Running ${searchQueries.length} search queries`);
  if (dryRun) console.log('(dry run - no files will be written)\n');

  const seenUrls = loadSeenUrls();
  const seenCompanyRoles = loadSeenCompanyRoles();
  const date = new Date().toISOString().slice(0, 10);

  let totalApiResults = 0;
  let totalSearchResults = 0;
  let totalFiltered = 0;
  let totalDupes = 0;
  const newOffers = [];
  const errors = [];

  const apiTasks = targets.map(company => async () => {
    const { type, url } = company._api;
    try {
      const json = await fetchJson(url);
      const jobs = PARSERS[type](json, company.name);
      totalApiResults += jobs.length;

      for (const job of jobs) {
        const verdict = acceptJob({ ...job, source: `${type}-api` }, titleFilter, seenUrls, seenCompanyRoles);
        if (verdict === 'filtered') {
          totalFiltered++;
          continue;
        }
        if (verdict === 'duplicate') {
          totalDupes++;
          continue;
        }
        newOffers.push({ ...job, source: `${type}-api` });
      }
    } catch (err) {
      errors.push({ source: company.name, error: err.message });
    }
  });

  await parallelFetch(apiTasks, CONCURRENCY);

  const searchTasks = searchQueries.map(queryConfig => async () => {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(queryConfig.query)}`;
      const html = await fetchText(searchUrl);
      const jobs = parseDuckDuckGoResults(html, queryConfig.name);
      totalSearchResults += jobs.length;

      for (const job of jobs) {
        const verdict = acceptJob(job, titleFilter, seenUrls, seenCompanyRoles);
        if (verdict === 'filtered') {
          totalFiltered++;
          continue;
        }
        if (verdict === 'duplicate') {
          totalDupes++;
          continue;
        }
        newOffers.push(job);
      }
    } catch (err) {
      errors.push({ source: queryConfig.name, error: err.message });
    }
  });

  await parallelFetch(searchTasks, SEARCH_CONCURRENCY);

  if (!dryRun && newOffers.length > 0) {
    appendToPipeline(newOffers);
    appendToScanHistory(newOffers, date);
  }

  console.log(`\n${'-'.repeat(45)}`);
  console.log(`Portal Scan - ${date}`);
  console.log(`${'-'.repeat(45)}`);
  console.log(`Companies scanned:     ${targets.length}`);
  console.log(`Queries executed:      ${searchQueries.length}`);
  console.log(`Total jobs found:      ${totalApiResults + totalSearchResults}`);
  console.log(`  API results:         ${totalApiResults}`);
  console.log(`  Search results:      ${totalSearchResults}`);
  console.log(`Filtered by title:     ${totalFiltered} removed`);
  console.log(`Duplicates:            ${totalDupes} skipped`);
  console.log(`New offers added:      ${newOffers.length}`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const error of errors) {
      console.log(`  x ${error.source}: ${error.error}`);
    }
  }

  if (newOffers.length > 0) {
    console.log('\nNew offers:');
    for (const offer of newOffers) {
      console.log(`  + ${offer.company} | ${offer.title} | ${offer.location || 'N/A'}`);
    }
    if (dryRun) {
      console.log('\n(dry run - run without --dry-run to save results)');
    } else {
      console.log(`\nResults saved to ${PIPELINE_PATH} and ${SCAN_HISTORY_PATH}`);
    }
  }

  console.log('\n-> Run /career-ops pipeline to evaluate new offers.');
  console.log('-> Share results and get help: https://discord.gg/8pRpHETxa4');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
