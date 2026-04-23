#!/usr/bin/env node

import { existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { spawnSync } from 'child_process';

function parseArgs(argv) {
  const options = {
    candidate: 'candidate',
    date: new Date().toISOString().slice(0, 10),
    to: 'candidate@example.com',
    mode: 'draft',
    outputDir: 'output',
  };

  for (const arg of argv) {
    if (arg.startsWith('--candidate=')) options.candidate = arg.split('=')[1];
    else if (arg.startsWith('--date=')) options.date = arg.split('=')[1];
    else if (arg.startsWith('--to=')) options.to = arg.split('=')[1];
    else if (arg.startsWith('--mode=')) options.mode = arg.split('=')[1].toLowerCase();
    else if (arg.startsWith('--output-dir=')) options.outputDir = arg.split('=')[1];
  }

  if (!['draft', 'send'].includes(options.mode)) {
    throw new Error(`Invalid mode "${options.mode}". Use draft or send.`);
  }

  return options;
}

function pickFiles({ candidate, date, outputDir }) {
  const dir = resolve(outputDir);
  if (!existsSync(dir)) {
    throw new Error(`Output directory not found: ${dir}`);
  }

  const entries = readdirSync(dir)
    .map(name => ({ name, path: resolve(dir, name) }))
    .filter(entry => statSync(entry.path).isFile());

  const postulaciones = entries.filter(entry =>
    entry.name.startsWith(`${candidate}-`) &&
    entry.name.endsWith('-postulacion.md')
  );

  const shortlist = entries.filter(entry =>
    entry.name === `${candidate}-shortlist-${date}.md`
  );

  const pdfs = entries.filter(entry =>
    entry.name.startsWith(`cv-${candidate}-`) &&
    entry.name.endsWith(`-${date}.pdf`)
  );

  const attachments = [...shortlist, ...postulaciones, ...pdfs]
    .sort((a, b) => a.name.localeCompare(b.name));

  if (attachments.length === 0) {
    throw new Error(`No matching attachments found for ${candidate} on ${date}.`);
  }

  return { attachments, postulaciones, pdfs, shortlist };
}

function buildBody({ date, postulaciones, pdfs, shortlist }) {
  const lines = [
    'Hola,',
    '',
    `Te envio el paquete de postulaciones preparado el ${date}.`,
    '',
    'Adjuntos incluidos:',
  ];

  if (shortlist.length > 0) {
    lines.push(`- Shortlist: ${shortlist.map(file => file.name).join(', ')}`);
  }

  if (postulaciones.length > 0) {
    lines.push(`- Archivos de postulacion (.md): ${postulaciones.length}`);
  }

  if (pdfs.length > 0) {
    lines.push(`- CVs en PDF: ${pdfs.length}`);
  }

  lines.push(
    '',
    'Cada archivo de postulacion incluye el link del aviso o el medio exacto para aplicar.',
    'La idea es que revises los materiales y completes manualmente cada postulacion.',
    '',
    'Saludos,'
  );

  return lines.join('\r\n');
}

function sendViaOutlook({ to, subject, body, attachments, mode }) {
  const escapedAttachments = attachments
    .map(file => `'${file.path.replace(/'/g, "''")}'`)
    .join(', ');

  const escapedBody = body.replace(/'/g, "''");
  const escapedSubject = subject.replace(/'/g, "''");
  const escapedTo = to.replace(/'/g, "''");
  const shouldSend = mode === 'send' ? '$true' : '$false';

  const psScript = `
$ErrorActionPreference = 'Stop'
try {
  $outlook = New-Object -ComObject Outlook.Application
  $mail = $outlook.CreateItem(0)
  $mail.To = '${escapedTo}'
  $mail.Subject = '${escapedSubject}'
  $mail.Body = '${escapedBody}'
  $attachments = @(${escapedAttachments})
  foreach ($attachment in $attachments) {
    $null = $mail.Attachments.Add($attachment)
  }
  if (${shouldSend}) {
    $mail.Send()
    Write-Output 'EMAIL_SENT'
  } else {
    $mail.Save()
    Write-Output 'EMAIL_DRAFTED'
  }
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
`;

  const result = spawnSync('powershell', ['-NoProfile', '-Command', psScript], {
    encoding: 'utf8',
    cwd: process.cwd(),
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'Failed to create/send Outlook email.');
  }

  return result.stdout.trim();
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const selection = pickFiles(options);

  const manifestPath = resolve(options.outputDir, `${options.candidate}-email-packet-${options.date}.json`);
  const manifest = {
    generated_at: new Date().toISOString(),
    candidate: options.candidate,
    date: options.date,
    to: options.to,
    mode: options.mode,
    attachments: selection.attachments.map(file => file.name),
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const subject = `Paquete de postulaciones ${options.date}`;
  const body = buildBody({ date: options.date, ...selection });
  const status = sendViaOutlook({
    to: options.to,
    subject,
    body,
    attachments: selection.attachments,
    mode: options.mode,
  });

  console.log(`Candidate:   ${options.candidate}`);
  console.log(`Date:        ${options.date}`);
  console.log(`Recipient:   ${options.to}`);
  console.log(`Mode:        ${options.mode}`);
  console.log(`Attachments: ${selection.attachments.length}`);
  console.log(`Manifest:    ${manifestPath}`);
  console.log(`Status:      ${status}`);
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
