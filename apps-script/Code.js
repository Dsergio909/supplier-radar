/**
 * Supplier Radar — Google Apps Script adapter.
 *
 * Wires the pure logic in src/core (Classifier, Compliance, Documents, Messages) to
 * Sheets, Gmail and Drive. The core files (core_*.js) live next to this one;
 * paste every .js file of this folder into Apps Script, or `clasp push` it
 * (see docs/como-funciona.md). `npm run build:gas` regenerates them.
 *
 * Spreadsheet tabs:
 *   Proveedores — you create it, with headers:
 *                 id | name | domain | emails | contractId | contractEnd |
 *                 docsRequestedAt | docsReceivedAt | manualStatus
 *                 Optional, recommended: rutAt | chamberAt | bankLetterAt | policyAt
 *                 (issue date of each document, read from the document itself),
 *                 policyUntil, taxId (the supplier's NIT, to check it matches the
 *                 documents) and remindedAt (needed for reminders).
 *   Documentos  — every attachment read: what it is, its date and whether it is
 *                 recent enough; the doubtful ones wait for a person (created by the script)
 *   Registro    — audit log of every classified email (created by the script)
 *   Revisión    — human review queue (created by the script)
 *   Dashboard   — KPIs (created by the script)
 */

var CONFIG = {
  SUPPLIERS_SHEET: 'Proveedores',
  LOG_SHEET: 'Registro',
  REVIEW_SHEET: 'Revisión',
  DASHBOARD_SHEET: 'Dashboard',
  LABEL: 'Supplier Radar',
  INBOX_QUERY: 'in:inbox newer_than:7d -category:promotions -category:social',
  MAX_THREADS: 100,
  DRIVE_FOLDER_PROPERTY: 'DRIVE_FOLDER_ID',
  LANG: 'es',
  DISCARD_WORD: 'descartar',
  DOCUMENTS_SHEET: 'Documentos',
  // Read scans, photos and PDFs with Google Drive's OCR to tell what each document is
  // and when it was issued. false = go by the file name only (as before).
  READ_DOCUMENTS: true,
  // How old each document may be, in days from its issue date. Every company has its own
  // rules (a Chamber of Commerce certificate "no older than 30 days"): change them here.
  MAX_AGE_DAYS: { rut: 30, chamber: 30, 'bank-letter': 30, 'social-security': 45, financials: 485 },
  REQUEST_SUBJECT: 'Solicitud de documentos — contrato {contractId}',
  REQUEST_BODY:
    'Hola {name},\n\nPara mantener al día el contrato {contractId}, por favor respondan este correo ' +
    'adjuntando RUT, cámara de comercio y certificado bancario vigentes.\n\n¡Gracias!',
  REMINDER_SUBJECT: 'Recordatorio: documentos pendientes — contrato {contractId}',
  REMINDER_BODY:
    'Hola {name},\n\nSeguimos esperando estos documentos del contrato {contractId}: {missing}.\n' +
    'Por favor respondan este correo con los archivos adjuntos.\n\n¡Gracias!'
};
// Review rows with these reasons cannot be applied until someone confirms by phone.
var CALL_REQUIRED = ['bank-change', 'unverified-sender', 'lookalike-domain'];

var DOC_HEADERS = ['Fecha', 'Proveedor', 'Archivo', 'Documento', 'Confianza', 'Por qué', 'Fecha del documento',
  'Antigüedad (días)', 'Vigente hasta', 'Estado', 'NIT coincide', 'Enlace', 'ID mensaje',
  'Confirmar (tipo de documento o "no")', 'Aplicado'];
var LOG_HEADERS = ['Fecha', 'De', 'Asunto', 'Decisión', 'Confianza', 'Proveedor', 'Explicación', 'Enlace', 'ID mensaje'];
var REVIEW_HEADERS = ['Fecha', 'De', 'Asunto', 'Confianza', 'Explicación', 'Candidatos', 'Enlace', 'ID mensaje',
  'Requiere llamada', 'Verificado por llamada (quién y cuándo)', 'Asignar a (id o "descartar")', 'Aplicado'];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Supplier Radar')
    .addItem('1. Solicitar documentos pendientes', 'requestDocuments')
    .addItem('2. Procesar bandeja de entrada', 'scanInbox')
    .addItem('3. Aplicar decisiones de revisión', 'applyReviewDecisions')
    .addItem('4. Actualizar dashboard', 'refreshDashboard')
    .addItem('5. Enviar recordatorios', 'sendReminders')
    .addItem('6. Aplicar documentos revisados', 'applyDocumentDecisions')
    .addSeparator()
    .addItem('Instalar ejecución automática', 'installTriggers')
    .addToUi();
}

/** Email every supplier that has never been asked for documents. */
function requestDocuments() {
  var table = readSuppliers_();
  table.rows.forEach(function (row) {
    var s = row.supplier;
    if (s.docsRequestedAt || !s.emails.length) return;
    GmailApp.sendEmail(s.emails[0], fill_(CONFIG.REQUEST_SUBJECT, s), fill_(CONFIG.REQUEST_BODY, s));
    table.write(row, 'docsRequestedAt', now_());
  });
}

/**
 * Classify every new inbox message once: confirmed matches file their
 * documents, ambiguous ones go to the review sheet, all are logged.
 */
function scanInbox() {
  withLock_(scanInbox_);
}

function scanInbox_() {
  var table = readSuppliers_();
  var suppliers = table.rows.map(function (r) { return r.supplier; });
  var log = sheet_(CONFIG.LOG_SHEET, LOG_HEADERS);
  var review = sheet_(CONFIG.REVIEW_SHEET, REVIEW_HEADERS);
  var seen = columnSet_(log, LOG_HEADERS.indexOf('ID mensaje') + 1);
  var me = Session.getEffectiveUser().getEmail().toLowerCase();
  var label = GmailApp.getUserLabelByName(CONFIG.LABEL) || GmailApp.createLabel(CONFIG.LABEL);

  GmailApp.search(CONFIG.INBOX_QUERY, 0, CONFIG.MAX_THREADS).forEach(function (thread) {
    var matched = false;
    thread.getMessages().forEach(function (message) {
      var id = message.getId();
      // Skip what was already logged and our own outgoing requests in the thread.
      if (seen[id] || Classifier.senderEmail(message.getFrom()) === me) return;
      seen[id] = true;

      var result = Classifier.classifyEmail({
        from: message.getFrom(),
        subject: message.getSubject(),
        body: message.getPlainBody().slice(0, 5000),
        attachments: message.getAttachments().map(function (a) { return a.getName(); }),
        senderVerified: senderVerified_(message)
      }, suppliers);
      var explanation = Messages.explain(result, CONFIG.LANG);
      var link = thread.getPermalink();

      log.appendRow([message.getDate(), safeCell_(message.getFrom()), safeCell_(message.getSubject()), result.decision,
        result.tier || '', result.supplierId || '', explanation, link, asText_(id)]);

      if (result.decision === 'confirmed' && (result.documents.length || (CONFIG.READ_DOCUMENTS && result.documentAttached))) {
        recordDocuments_(table, result.supplierId, message, result.documents);
      } else if (result.decision === 'confirmed' && result.documentAttached) {
        // Filed, but files like a price list do not count as the requested documents.
        saveAttachments_(table.byId[result.supplierId].supplier, message.getAttachments());
      } else if (result.decision === 'review') {
        var candidates = result.candidates.map(function (c) { return c.supplierId + ' (' + c.tier + ')'; });
        var callRequired = CALL_REQUIRED.indexOf(result.reason.code) >= 0 ? 'sí' : '';
        review.appendRow([message.getDate(), safeCell_(message.getFrom()), safeCell_(message.getSubject()), result.tier, explanation,
          candidates.join(', '), link, asText_(id), callRequired, '', '', '']);
      }
      matched = matched || result.decision !== 'unmatched';
    });
    if (matched) thread.addLabel(label);
  });
  refreshDashboard();
}

/** Apply the supplier ids a person typed in the review sheet. */
function applyReviewDecisions() {
  withLock_(applyReviewDecisions_);
}

function applyReviewDecisions_() {
  var table = readSuppliers_();
  var review = sheet_(CONFIG.REVIEW_SHEET, REVIEW_HEADERS);
  var values = review.getDataRange().getValues();
  var log = sheet_(CONFIG.LOG_SHEET, LOG_HEADERS);
  var who = whoAmI_();
  var col = {
    messageId: REVIEW_HEADERS.indexOf('ID mensaje'),
    link: REVIEW_HEADERS.indexOf('Enlace'),
    callRequired: REVIEW_HEADERS.indexOf('Requiere llamada'),
    verified: REVIEW_HEADERS.length - 3,
    assign: REVIEW_HEADERS.length - 2,
    applied: REVIEW_HEADERS.length - 1
  };
  var unknown = [];
  var missing = [];
  var unverified = [];

  for (var i = 1; i < values.length; i++) {
    var choice = String(values[i][col.assign] || '').trim();
    if (!choice || values[i][col.applied]) continue;

    var verified = String(values[i][col.verified] || '').trim();
    var stamp = formatDate_(now_()) + ' por ' + who;

    if (choice.toLowerCase() === CONFIG.DISCARD_WORD) {
      review.getRange(i + 1, col.applied + 1).setValue('descartado ' + stamp);
      logDecision_(log, values[i], col, 'descartado por una persona', '', who, verified);
      continue;
    }
    if (!table.byId[choice]) {
      unknown.push(choice);
      continue;
    }
    // Bank changes and possible spoofing: only after a call to the number already on file.
    if (String(values[i][col.callRequired]).trim() === 'sí' && !verified) {
      unverified.push(i + 1);
      continue;
    }
    var message = GmailApp.getMessageById(values[i][col.messageId]);
    if (!message) {
      missing.push(values[i][col.messageId]); // deleted from Gmail: leave the row pending
      continue;
    }
    var names = message.getAttachments().map(function (a) { return a.getName(); });
    var types = Classifier.documentTypes(names);
    // With reading on, every attachment is read: a photo called IMG_1234.jpg can be the RUT.
    if (types.length || (CONFIG.READ_DOCUMENTS && names.length)) recordDocuments_(table, choice, message, types);
    else if (names.length) saveAttachments_(table.byId[choice].supplier, message.getAttachments());
    review.getRange(i + 1, col.applied + 1).setValue('asignado ' + stamp);
    logDecision_(log, values[i], col, 'asignado por una persona', choice, who, verified);
  }

  if (unknown.length) {
    SpreadsheetApp.getActive().toast('Ids de proveedor desconocidos: ' + unknown.join(', '), 'Supplier Radar');
  }
  if (missing.length) {
    SpreadsheetApp.getActive().toast('Correos que ya no existen en Gmail: ' + missing.join(', '), 'Supplier Radar');
  }
  if (unverified.length) {
    SpreadsheetApp.getActive().toast('Falta confirmar por teléfono (columna «Verificado por llamada») en las filas: ' +
      unverified.join(', '), 'Supplier Radar');
  }
  refreshDashboard();
}

/** Who took a decision: the person running the menu (falls back to the script owner). */
function whoAmI_() {
  var email = '';
  try { email = Session.getActiveUser().getEmail(); } catch (e) { /* not available for this account */ }
  return email || Session.getEffectiveUser().getEmail();
}

/** Human decisions go to the audit log too, with who decided and the phone check (SAGRILAFT). */
function logDecision_(log, row, col, decision, supplierId, who, verified) {
  log.appendRow([now_(), safeCell_(row[1]), safeCell_(row[2]), decision, '', supplierId,
    safeCell_('Decidió: ' + who + (verified ? ' · verificado por llamada: ' + verified : '')),
    row[col.link], asText_(String(row[col.messageId]).replace(/^'/, '') + '#persona')]);
}

/**
 * Remind suppliers that are still missing documents after the grace period,
 * at most once a week each. Needs a remindedAt column so nobody gets spammed.
 */
function sendReminders() {
  withLock_(sendReminders_);
}

function sendReminders_() {
  var table = readSuppliers_();
  if (!table.has('remindedAt')) {
    SpreadsheetApp.getActive().toast('Agrega la columna remindedAt a la hoja Proveedores para enviar recordatorios.',
      'Supplier Radar');
    return;
  }
  var today = now_();
  table.rows.forEach(function (row) {
    var s = row.supplier;
    if (!s.emails.length || !Compliance.needsReminder(s, today, complianceOptions_())) return;
    var missing = Compliance.missingDocuments(s, complianceOptions_()).map(function (t) { return Messages.docName(t, CONFIG.LANG); });
    var fields = Object.assign({}, s, { missing: missing.length ? missing.join(', ') : 'RUT, cámara de comercio y certificado bancario' });
    GmailApp.sendEmail(s.emails[0], fill_(CONFIG.REMINDER_SUBJECT, fields), fill_(CONFIG.REMINDER_BODY, fields));
    table.write(row, 'remindedAt', today);
  });
}

/** Recompute KPIs from dates only and write them to the Dashboard tab. */
function refreshDashboard() {
  var suppliers = readSuppliers_().rows.map(function (r) { return r.supplier; });
  var summary = Compliance.summarize(suppliers, now_(), complianceOptions_());
  var sheet = sheet_(CONFIG.DASHBOARD_SHEET, []);
  sheet.clear();
  [
    ['Actualizado', now_()],
    ['Vencidos', summary.counts.expired],
    ['En riesgo', summary.counts['at-risk']],
    ['Por vencer (30 días)', summary.counts.expiring],
    ['Al día', summary.counts.active],
    [''],
    ['Proveedor', 'Estado', 'Días restantes', 'Motivo', 'Estado manual desactualizado', 'Documentos faltantes']
  ].forEach(function (row) { sheet.appendRow(row); });
  summary.rows.forEach(function (r) {
    sheet.appendRow([r.supplier.name, r.status, r.daysLeft === null ? '' : r.daysLeft,
      Messages.format(r.reason, CONFIG.LANG), r.staleManualStatus ? 'sí' : '',
      r.missing.map(function (t) { return Messages.docName(t, CONFIG.LANG); }).join(', ')]);
  });
}

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('scanInbox').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('requestDocuments').timeBased().everyDays(1).atHour(8).create();
  ScriptApp.newTrigger('sendReminders').timeBased().everyDays(1).atHour(9).create();
}

// ---------- helpers ----------

/** Run `fn` only if no other execution (trigger or manual) is running. */
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    console.warn('Supplier Radar: otra ejecución sigue en curso; se omite esta.');
    return;
  }
  try {
    fn();
  } finally {
    lock.releaseLock();
  }
}

/**
 * True when Gmail authenticated the sender (SPF or DMARC pass). Anyone can
 * forge a "From" header, so unauthenticated mail is never auto-confirmed.
 */
function senderVerified_(message) {
  var results = message.getHeader('Authentication-Results') || '';
  return /\b(dmarc|spf)=pass\b/i.test(results);
}

/** Email text written to Sheets must never run as a formula (=, +, -, @). */
function safeCell_(value) {
  var text = String(value || '');
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function now_() {
  return new Date();
}

function readSuppliers_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SUPPLIERS_SHEET);
  if (!sheet) throw new Error('Falta la hoja "' + CONFIG.SUPPLIERS_SHEET + '"');
  var values = sheet.getDataRange().getValues();
  var headers = values.shift().map(function (h) { return String(h).trim(); });
  var col = {};
  headers.forEach(function (h, i) { col[h] = i; });

  var rows = values
    .map(function (v, i) {
      var s = {};
      headers.forEach(function (h, j) { s[h] = v[j] === '' || v[j] === undefined ? null : v[j]; });
      s.id = s.id === null ? '' : String(s.id);
      s.emails = String(s.emails || '').split(/[,;\s]+/).filter(String);
      return { index: i + 2, supplier: s };
    })
    .filter(function (r) { return r.supplier.id; });
  var byId = {};
  rows.forEach(function (r) { byId[r.supplier.id] = r; });

  return {
    rows: rows,
    byId: byId,
    has: function (field) { return col[field] !== undefined; },
    /** Optional columns that the sheet does not have are skipped. */
    write: function (row, field, value) {
      if (col[field] === undefined) return;
      sheet.getRange(row.index, col[field] + 1).setValue(value);
      row.supplier[field] = value;
    }
  };
}

/**
 * File the attachments in Drive and work out which documents they are.
 *
 * With READ_DOCUMENTS on, each file is read (Drive OCR) and a document is applied
 * on its own only when its content says clearly what it is, it is recent enough and
 * the NIT in it is not someone else's. Everything read is listed in the Documentos
 * tab; the doubtful ones wait there for a person. The file name is only a fallback,
 * never enough on its own.
 */
function recordDocuments_(table, supplierId, message, types) {
  var row = table.byId[supplierId];
  var attachments = message.getAttachments();
  saveAttachments_(row.supplier, attachments);
  if (!CONFIG.READ_DOCUMENTS) {
    applyDocuments_(table, row, (types || []).map(function (t) { return { type: t, issuedAt: null }; }), message.getDate());
    return;
  }
  var sheet = sheet_(CONFIG.DOCUMENTS_SHEET, DOC_HEADERS);
  var applied = [];
  attachments.forEach(function (attachment) {
    var result = readDocument_(attachment, row.supplier);
    var docs = result.documents.length ? result.documents : [null];
    var clear = Documents.clearDocuments(result);
    docs.forEach(function (d) {
      var isClear = clear.indexOf(d) !== -1;
      if (isClear) applied.push(d);
      logDocument_(sheet, message, row.supplier, attachment.getName(), result, d, isClear);
    });
  });
  applyDocuments_(table, row, applied, message.getDate());
}

/** What one attachment is, from its content (or, if it cannot be read, its name). */
function readDocument_(attachment, supplier) {
  var text = '';
  try { text = ocrText_(attachment); } catch (e) { console.warn('Supplier Radar: no se pudo leer ' + attachment.getName() + ': ' + e); }
  return Documents.read(text, {
    today: formatDate_(now_()).slice(0, 10),
    rules: docRules_(),
    supplierTaxId: supplier.taxId,
    fileName: attachment.getName(),
    fileNameType: function (name) { return Classifier.documentTypes([name])[0] || null; }
  });
}

/**
 * Text of a PDF, scan or photo through Google Drive's OCR: the file is uploaded as a
 * temporary Google Doc, exported as plain text and deleted at once. Only the result of
 * reading it is kept (type, date), never the text: documents carry ID and account numbers.
 */
function ocrText_(attachment) {
  var blob = attachment.copyBlob();
  var type = String(blob.getContentType() || '');
  if (!/^(application\/pdf|image\/(jpeg|png|gif|bmp|tiff|webp))$/.test(type)) return '';
  var bytes = blob.getBytes();
  if (bytes.length > 10 * 1024 * 1024) return '';
  var token = ScriptApp.getOAuthToken();
  var boundary = 'supplier-radar-' + Utilities.getUuid();
  var head = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify({ name: 'Supplier Radar OCR (temporal)', mimeType: 'application/vnd.google-apps.document' }) +
    '\r\n--' + boundary + '\r\nContent-Type: ' + type + '\r\n\r\n';
  var payload = Utilities.newBlob(head).getBytes().concat(bytes, Utilities.newBlob('\r\n--' + boundary + '--').getBytes());
  var created = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&ocrLanguage=es&fields=id', {
    method: 'post', contentType: 'multipart/related; boundary=' + boundary, payload: payload,
    headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true
  });
  if (created.getResponseCode() >= 300) return '';
  var id = JSON.parse(created.getContentText()).id;
  try {
    var exported = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '/export?mimeType=text%2Fplain', {
      headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true
    });
    return exported.getResponseCode() < 300 ? exported.getContentText().slice(0, 30000) : '';
  } finally {
    UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id), {
      method: 'delete', headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true
    });
  }
}

/**
 * Write each document's date (its issue date when known, otherwise the day it arrived),
 * the policy's end date, and docsReceivedAt. Dates only move forward.
 */
function applyDocuments_(table, row, docs, arrived) {
  if (!docs.length) return;
  docs.forEach(function (d) {
    var updates = Compliance.documentUpdates(row.supplier, [d.type], toDate_(d.issuedAt) || arrived);
    delete updates.docsReceivedAt;
    Object.keys(updates).forEach(function (field) { table.write(row, field, updates[field]); });
    if (d.validUntil && table.has('policyUntil')) table.write(row, 'policyUntil', toDate_(d.validUntil));
  });
  var received = Compliance.documentUpdates(row.supplier, ['received'], arrived);
  if (received.docsReceivedAt) table.write(row, 'docsReceivedAt', received.docsReceivedAt);
}

/** One row in the Documentos tab per document found (or per file nothing was found in). */
function logDocument_(sheet, message, supplier, fileName, result, doc, applied) {
  var lang = CONFIG.LANG;
  var state = doc ? Messages.documentStatus(doc, lang) : Messages.documentStatus(result, lang);
  sheet.appendRow([message.getDate(), supplier.id + ' — ' + supplier.name, safeCell_(fileName),
    doc ? Messages.docName(doc.type, lang) : '', doc ? Messages.confidenceName(doc.confidence, lang) : '',
    doc ? Messages.documentEvidence(result.source, doc.evidence, lang) : '',
    doc && doc.issuedAt ? doc.issuedAt : '', doc && doc.ageDays !== null ? doc.ageDays : '', doc && doc.validUntil ? doc.validUntil : '',
    state, result.taxIdMatches === null ? '' : (result.taxIdMatches ? 'sí' : 'NO'),
    message.getThread ? message.getThread().getPermalink() : '', asText_(message.getId()), '',
    applied ? 'aplicado automáticamente ' + formatDate_(now_()) : '']);
}

/** Apply the document types a person confirmed in the Documentos tab. */
function applyDocumentDecisions() {
  withLock_(function () {
    var table = readSuppliers_();
    var sheet = sheet_(CONFIG.DOCUMENTS_SHEET, DOC_HEADERS);
    var values = sheet.getDataRange().getValues();
    var c = {};
    DOC_HEADERS.forEach(function (h, i) { c[h] = i; });
    var who = whoAmI_();
    var unknown = [];
    for (var i = 1; i < values.length; i++) {
      var v = values[i];
      var choice = String(v[c['Confirmar (tipo de documento o "no")']] || '').trim();
      if (!choice || v[c['Aplicado']]) continue;
      var stamp = formatDate_(now_()) + ' por ' + who;
      if (choice.toLowerCase() === 'no') { sheet.getRange(i + 1, c['Aplicado'] + 1).setValue('descartado ' + stamp); continue; }
      var type = Messages.docTypeFromName(choice);
      var id = String(v[c['Proveedor']] || '').split(' — ')[0];
      if (!type || !table.byId[id]) { unknown.push(i + 1); continue; }
      var date = v[c['Fecha del documento']] || v[c['Fecha']];
      applyDocuments_(table, table.byId[id], [{ type: type, issuedAt: date, validUntil: v[c['Vigente hasta']] || null }], v[c['Fecha']]);
      sheet.getRange(i + 1, c['Aplicado'] + 1).setValue('confirmado ' + stamp);
    }
    if (unknown.length) {
      SpreadsheetApp.getActive().toast('No entendí el documento o el proveedor en las filas: ' + unknown.join(', ') +
        '. Escribe por ejemplo «RUT», «Cámara de comercio» o «no».', 'Supplier Radar');
    }
    refreshDashboard();
  });
}

/** A Date for the sheet: Dates stay, 'YYYY-MM-DD' becomes that day at noon (no time-zone slips). */
function toDate_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]') return value;
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null;
}

function docRules_() {
  var rules = {};
  Object.keys(CONFIG.MAX_AGE_DAYS).forEach(function (t) { rules[t] = { maxAgeDays: CONFIG.MAX_AGE_DAYS[t] }; });
  return rules;
}

/** Documents count while they are recent enough (from their issue date), as configured above. */
function complianceOptions_() {
  return CONFIG.READ_DOCUMENTS ? { today: now_(), maxAgeDays: CONFIG.MAX_AGE_DAYS } : {};
}

function saveAttachments_(supplier, attachments) {
  var folderId = PropertiesService.getScriptProperties().getProperty(CONFIG.DRIVE_FOLDER_PROPERTY);
  if (!folderId || !attachments.length) return;
  var root = DriveApp.getFolderById(folderId);
  var name = supplier.id + ' — ' + supplier.name;
  var folders = root.getFoldersByName(name);
  var folder = folders.hasNext() ? folders.next() : root.createFolder(name);
  attachments.forEach(function (a) { folder.createFile(a.copyBlob()); });
}

function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers.length) sheet.appendRow(headers);
  }
  return sheet;
}

/** Set of the non-empty values in one column, header row excluded. */
function columnSet_(sheet, column) {
  var set = {};
  var last = sheet.getLastRow();
  if (last < 2) return set;
  sheet.getRange(2, column, last - 1, 1).getValues().forEach(function (r) {
    if (r[0]) set[r[0]] = true;
  });
  return set;
}

/** Leading apostrophe stops Sheets from turning ids like "1234e5" into numbers. */
function asText_(value) {
  return "'" + value;
}

function fill_(template, supplier) {
  return template.replace(/\{(\w+)\}/g, function (_, key) { return supplier[key] || ''; });
}

function formatDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}
