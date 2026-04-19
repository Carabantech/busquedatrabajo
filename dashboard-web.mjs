#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const trackerPath = existsSync(join(projectRoot, 'data', 'applications.md'))
  ? join(projectRoot, 'data', 'applications.md')
  : join(projectRoot, 'applications.md');
const outputDir = join(projectRoot, 'output');
const outputPath = join(outputDir, 'dashboard.html');

const FINAL_STATUSES = new Set(['offer', 'rejected', 'discarded', 'skip']);

function parseTracker(markdown) {
  const entries = [];

  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|')) continue;

    const parts = line.split('|').map((part) => part.trim());
    if (parts.length < 10) continue;

    const num = Number.parseInt(parts[1], 10);
    if (Number.isNaN(num)) continue;

    const status = parts[6];
    const reportMatch = parts[8].match(/\]\(([^)]+)\)/);
    const score = parts[5];
    const numericScore = score.endsWith('/5') ? Number.parseFloat(score) : null;
    const normalizedStatus = status.toLowerCase();
    const isClosed = FINAL_STATUSES.has(normalizedStatus);
    const pdfCell = parts[7];
    const hasPdf = pdfCell !== '' && !pdfCell.includes('❌') && !pdfCell.includes('âŒ');

    entries.push({
      num,
      date: parts[2],
      company: parts[3],
      role: parts[4],
      score,
      numericScore,
      status,
      pdf: pdfCell,
      hasPdf,
      reportLabel: parts[8],
      reportPath: reportMatch ? reportMatch[1] : '',
      notes: parts[9] || '',
      processLabel: isClosed ? 'Cerrado' : 'En curso',
      isClosed,
    });
  }

  return entries.sort((a, b) => {
    if (a.date === b.date) return b.num - a.num;
    return String(b.date).localeCompare(String(a.date));
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildHtml(entries) {
  const total = entries.length;
  const closed = entries.filter((entry) => entry.isClosed).length;
  const active = total - closed;
  const withPdf = entries.filter((entry) => entry.hasPdf).length;
  const avgScore = entries.filter((entry) => entry.numericScore !== null);
  const average = avgScore.length
    ? (avgScore.reduce((sum, entry) => sum + entry.numericScore, 0) / avgScore.length).toFixed(1)
    : 'N/A';

  const rows = entries.map((entry) => {
    const reportHref = entry.reportPath ? `../${entry.reportPath}` : '#';
    return `
      <tr>
        <td>${entry.num}</td>
        <td>${escapeHtml(entry.date)}</td>
        <td>${escapeHtml(entry.company)}</td>
        <td>${escapeHtml(entry.role)}</td>
        <td>${escapeHtml(entry.status)}</td>
        <td><span class="pill ${entry.isClosed ? 'closed' : 'active'}">${entry.processLabel}</span></td>
        <td>${escapeHtml(entry.score)}</td>
        <td>${entry.hasPdf ? 'Si' : 'No'}</td>
        <td>${entry.reportPath ? `<a href="${escapeHtml(reportHref)}" target="_blank" rel="noreferrer">Abrir</a>` : '-'}</td>
        <td>${escapeHtml(entry.notes)}</td>
      </tr>`;
  }).join('');

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Career-Ops Dashboard</title>
    <style>
      :root {
        --bg: #f5efe3;
        --panel: rgba(255, 252, 245, 0.92);
        --panel-strong: #fffaf0;
        --ink: #1f2430;
        --muted: #5d6575;
        --line: rgba(31, 36, 48, 0.12);
        --accent: #0f766e;
        --accent-soft: rgba(15, 118, 110, 0.12);
        --warn: #92400e;
        --warn-soft: rgba(146, 64, 14, 0.12);
        --shadow: 0 20px 40px rgba(74, 54, 24, 0.12);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(15, 118, 110, 0.12), transparent 34%),
          radial-gradient(circle at top right, rgba(217, 119, 6, 0.15), transparent 26%),
          linear-gradient(180deg, #f7f1e5 0%, #efe6d3 100%);
      }

      .shell {
        width: min(1200px, calc(100% - 32px));
        margin: 32px auto;
      }

      .hero {
        padding: 28px;
        border: 1px solid var(--line);
        border-radius: 28px;
        background: linear-gradient(140deg, rgba(255, 250, 240, 0.96), rgba(250, 245, 234, 0.9));
        box-shadow: var(--shadow);
      }

      h1 {
        margin: 0 0 8px;
        font-size: clamp(2rem, 4vw, 3.8rem);
        line-height: 0.96;
      }

      .subtitle {
        margin: 0;
        max-width: 70ch;
        color: var(--muted);
        font-size: 1rem;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 14px;
        margin-top: 22px;
      }

      .card {
        padding: 16px 18px;
        border-radius: 20px;
        background: var(--panel);
        border: 1px solid var(--line);
      }

      .card strong {
        display: block;
        font-size: 2rem;
        margin-top: 8px;
      }

      .table-wrap {
        margin-top: 22px;
        padding: 18px;
        border-radius: 28px;
        border: 1px solid var(--line);
        background: var(--panel-strong);
        box-shadow: var(--shadow);
        overflow: auto;
      }

      .toolbar {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-top: 22px;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .field label {
        color: var(--muted);
        font-size: 0.84rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .field input,
      .field select {
        width: 100%;
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.9);
        color: var(--ink);
        font: inherit;
      }

      .results {
        margin-top: 14px;
        color: var(--muted);
        font-size: 0.95rem;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 920px;
      }

      th, td {
        padding: 14px 12px;
        text-align: left;
        border-bottom: 1px solid var(--line);
        vertical-align: top;
      }

      th {
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--muted);
      }

      tr:hover td {
        background: rgba(15, 118, 110, 0.04);
      }

      .pill {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 0.84rem;
        font-weight: 600;
      }

      .pill.active {
        color: var(--warn);
        background: var(--warn-soft);
      }

      .pill.closed {
        color: var(--accent);
        background: var(--accent-soft);
      }

      a {
        color: var(--accent);
        text-decoration: none;
        font-weight: 600;
      }

      a:hover {
        text-decoration: underline;
      }

      .footer {
        margin-top: 14px;
        color: var(--muted);
        font-size: 0.92rem;
      }

      @media (max-width: 720px) {
        .shell {
          width: min(100% - 18px, 1200px);
          margin: 12px auto 24px;
        }

        .hero, .table-wrap {
          border-radius: 20px;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <p class="subtitle">Vista simple del tracker generado desde <code>data/applications.md</code>.</p>
        <h1>Tablero de postulaciones</h1>
        <p class="subtitle">Muestra empresa, puesto, fecha, estado actual y si el proceso ya quedo cerrado o sigue en curso.</p>

        <div class="stats">
          <article class="card">
            <span>Total</span>
            <strong>${total}</strong>
          </article>
          <article class="card">
            <span>Activas</span>
            <strong>${active}</strong>
          </article>
          <article class="card">
            <span>Cerradas</span>
            <strong>${closed}</strong>
          </article>
          <article class="card">
            <span>Con PDF</span>
            <strong>${withPdf}</strong>
          </article>
          <article class="card">
            <span>Score promedio</span>
            <strong>${average}</strong>
          </article>
        </div>

        <div class="toolbar">
          <div class="field">
            <label for="search">Buscar</label>
            <input id="search" type="search" placeholder="Empresa o puesto">
          </div>
          <div class="field">
            <label for="statusFilter">Estado</label>
            <select id="statusFilter">
              <option value="">Todos</option>
              <option value="Evaluated">Evaluated</option>
              <option value="Applied">Applied</option>
              <option value="Responded">Responded</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Rejected">Rejected</option>
              <option value="Discarded">Discarded</option>
              <option value="SKIP">SKIP</option>
            </select>
          </div>
          <div class="field">
            <label for="processFilter">Proceso</label>
            <select id="processFilter">
              <option value="">Todos</option>
              <option value="En curso">En curso</option>
              <option value="Cerrado">Cerrado</option>
            </select>
          </div>
          <div class="field">
            <label for="pdfFilter">PDF</label>
            <select id="pdfFilter">
              <option value="">Todos</option>
              <option value="Si">Con PDF</option>
              <option value="No">Sin PDF</option>
            </select>
          </div>
        </div>
      </section>

      <section class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Empresa</th>
              <th>Puesto</th>
              <th>Estado</th>
              <th>Proceso</th>
              <th>Score</th>
              <th>PDF</th>
              <th>Reporte</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody id="applicationsTable">${rows}</tbody>
        </table>
        <p id="resultsCount" class="results"></p>
      </section>

      <p class="footer">Regenera esta vista con <code>npm run dashboard:web</code>.</p>
    </main>
    <script>
      const searchInput = document.getElementById('search');
      const statusFilter = document.getElementById('statusFilter');
      const processFilter = document.getElementById('processFilter');
      const pdfFilter = document.getElementById('pdfFilter');
      const rows = Array.from(document.querySelectorAll('#applicationsTable tr'));
      const resultsCount = document.getElementById('resultsCount');

      function applyFilters() {
        const search = searchInput.value.trim().toLowerCase();
        const status = statusFilter.value;
        const process = processFilter.value;
        const pdf = pdfFilter.value;
        let visible = 0;

        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          const company = cells[2].textContent.toLowerCase();
          const role = cells[3].textContent.toLowerCase();
          const rowStatus = cells[4].textContent.trim();
          const rowProcess = cells[5].textContent.trim();
          const rowPdf = cells[7].textContent.trim();

          const matchesSearch = search === '' || company.includes(search) || role.includes(search);
          const matchesStatus = status === '' || rowStatus === status;
          const matchesProcess = process === '' || rowProcess === process;
          const matchesPdf = pdf === '' || rowPdf === pdf;
          const show = matchesSearch && matchesStatus && matchesProcess && matchesPdf;

          row.hidden = !show;
          if (show) visible++;
        }

        resultsCount.textContent = visible === rows.length
          ? 'Mostrando todas las postulaciones.'
          : 'Mostrando ' + visible + ' de ' + rows.length + ' postulaciones.';
      }

      searchInput.addEventListener('input', applyFilters);
      statusFilter.addEventListener('change', applyFilters);
      processFilter.addEventListener('change', applyFilters);
      pdfFilter.addEventListener('change', applyFilters);
      applyFilters();
    </script>
  </body>
</html>`;
}

function openInBrowser(filePath) {
  try {
    if (process.platform === 'win32') {
      execFileSync('cmd', ['/c', 'start', '', filePath], { stdio: 'ignore' });
      return true;
    }

    if (process.platform === 'darwin') {
      execFileSync('open', [filePath], { stdio: 'ignore' });
      return true;
    }

    execFileSync('xdg-open', [filePath], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (!existsSync(trackerPath)) {
    console.error('No se encontro applications.md para generar el tablero.');
    process.exit(1);
  }

  const trackerContent = readFileSync(trackerPath, 'utf8');
  const entries = parseTracker(trackerContent);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, buildHtml(entries), 'utf8');

  console.log(`Dashboard web generado en ${resolve(outputPath)}`);

  if (process.argv.includes('--open')) {
    if (openInBrowser(resolve(outputPath))) {
      console.log('Dashboard abierto en el navegador.');
    } else {
      console.log('No pude abrir el navegador automaticamente, pero el archivo ya esta generado.');
    }
  }
}

main();
