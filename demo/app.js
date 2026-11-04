/* Supplier Radar demo — UI only. Every decision comes from src/core. */
(function () {
  'use strict';

  var I18N = {
    es: {
      skip: 'Saltar al contenido', module: 'Cumplimiento de proveedores', sections: 'Secciones',
      viewInbox: 'Bandeja', viewSuppliers: 'Proveedores', viewLog: 'Registro de decisiones', viewLogShort: 'Registro', tableSup: 'Tabla de proveedores', tableLog: 'Tabla de decisiones',
      sample: 'Datos de ejemplo', how: '¿Cómo funciona?',
      tabReview: 'Por revisar', tabConfirmed: 'Confirmados', tabIgnored: 'Ignorados',
      searchMail: 'Buscar correos', searchMailPh: 'Buscar por remitente, asunto o contrato',
      searchSup: 'Buscar proveedores', searchSupPh: 'Nombre o contrato',
      emptyReviewTitle: 'Todo revisado', emptyReview: 'No quedan correos dudosos. Mira cómo quedaron los proveedores.',
      emptyList: 'No hay correos en esta lista.', noMatch: 'Ningún correo coincide con la búsqueda.',
      pickMail: 'Elige un correo de la lista.', back: '← Volver', to: 'Para',
      fileDoc: 'documento: {name}', fileOther: 'no es un documento pedido',
      decision: 'Decisión', needsReview: 'Requiere revisión', autoConfirmed: 'Confirmado automáticamente',
      personAssigned: 'Asignado por una persona', ignored: 'Ignorado', discarded: 'Descartado por una persona', fraud: 'Marcado como fraude',
      alertSpoof: 'Gmail no pudo verificar quién envió este correo.', alertSpoofMore: ' Alguien podría estar haciéndose pasar por el proveedor.',
      alertBank: 'Pide cambiar los datos bancarios.', alertBankMore: ' No se acepta por correo: llame al número que ya está en la ficha del proveedor (no al que venga en el correo) y confirme el cambio.',
      alertLookalike: 'El dominio @{domain} se parece al de un proveedor (@{real}), pero no es el mismo.', alertLookalikeMore: ' Es una forma común de suplantación.',
      evVerified: 'Gmail verificó el remitente (SPF/DMARC)', evUnverified: 'Gmail no pudo verificar el remitente (SPF/DMARC)',
      evBank: 'Pide pagar en otra cuenta', evDocs: 'Adjuntos reconocidos: {list}', evNoDocs: 'Ningún adjunto parece un documento pedido',
      question: '¿De qué proveedor es este correo?', optDiscard: 'Ninguno: descartar', optDiscardSub: 'Queda en el registro, sin asignar.',
      optFraud: 'Es fraude: no aceptar', optFraudSub: 'Queda en el registro como fraude. Avise al proveedor por su número registrado.',
      optSupplierSub: '{contract} · registrado: {email}', optMissing: 'le faltan {n} documentos', optComplete: 'documentos al día',
      callCheck: 'Llamé al número registrado en la ficha del proveedor y confirmó que este correo es suyo.',
      apply: 'Aplicar decisión', needChoice: 'Elige una opción.', needCall: 'Falta confirmar por teléfono.',
      fSupplier: 'Proveedor', fConfidence: 'Confianza', fWhy: 'Por qué', fDocs: 'Documentos', fWho: 'Decidió', fCall: 'Verificado por llamada',
      docsRecorded: 'Registrados: {list}', docsFiled: 'Adjuntos archivados; no son documentos pedidos', docsNone: 'Sin adjuntos',
      you: 'Tú (demo)', system: 'Sistema', yes: 'Sí', openProfile: 'Ver ficha',
      flagSpoof: 'Posible suplantación', flagBank: 'Pide cambiar datos bancarios', flagLookalike: 'Dominio parecido al de un proveedor',
      flagTie: '{n} proveedores posibles', flagUnknown: 'Cita un contrato desde un correo desconocido', flagName: 'Solo coincide el nombre',
      flagWeak: 'Evidencia débil', flagAuto: 'Confirmado · {name}', flagPerson: 'Asignado por ti · {name}',
      flagNoSignal: 'Sin señal de ningún proveedor', flagAutoReply: 'Respuesta automática', flagDiscarded: 'Descartado por ti', flagFraud: 'Marcado como fraude',
      supSub: 'El estado se calcula con las fechas del contrato y de los documentos, no con lo que diga la hoja.',
      simDate: 'Fecha simulada:', filterStatus: 'Filtrar por estado',
      chipAll: 'Todos', st: { expired: 'Contrato vencido', 'at-risk': 'Documentos atrasados', expiring: 'Vence pronto', active: 'Al día' },
      colSupplier: 'Proveedor', colStatus: 'Estado', colEnds: 'Vence en', colDocs: 'Documentos', colActivity: 'Último movimiento',
      endsIn: '{n} días', endedAgo: 'venció hace {n} días', noEnd: 'sin fecha',
      actRequested: 'Pedidos hace {n} días', actReminded: 'recordatorio el {date}', actReceived: 'Recibidos el {date}', actNever: 'Sin pedir',
      docShort: { rut: 'R', chamber: 'C', 'bank-letter': 'B', policy: 'P' },
      legend: 'R: RUT · C: Cámara de comercio · B: Certificación bancaria. Verde: vigente · rojo: falta o vencido · gris: sin pedir.',
      docsOf: '{ok} de {total} documentos',
      noSuppliers: 'Ningún proveedor coincide con el filtro.',
      fContract: 'Contrato', fEnds: 'Vence', fEmail: 'Correo registrado', fDomain: 'Dominio', sharedDomain: '{domain} (compartido con {n} proveedores)',
      staleSheet: 'En la hoja dice «{sheet}», pero según las fechas está «{real}».',
      secDocs: 'Documentos', secMails: 'Correos del proveedor', secReminders: 'Recordatorios',
      docOk: 'Recibido', docOld: 'Copia vieja', docMissing: 'Falta', docNotAsked: 'Sin pedir', docOptional: 'Opcional',
      docOkMeta: 'el {date}', docOldMeta: 'recibido el {date}, antes del pedido del {req}', docMissingMeta: 'pedido el {req}',
      noMails: 'Sin correos asignados.', remindedOn: 'Último: {date}', noReminder: 'Ninguno enviado.',
      remind: 'Enviar recordatorio', remindSent: 'Recordatorio enviado (simulado).',
      remindNo: 'No hace falta: no tiene documentos atrasados.', remindExpired: 'Contrato vencido: primero se renueva o se cierra.', remindWait: 'Ya se envió uno hace {n} días; el siguiente, en {m} días.',
      logSub: 'Cada decisión, automática o de una persona, queda con fecha, hora y quién la tomó.',
      colWhen: 'Fecha y hora', colMail: 'Correo', colDecision: 'Decisión', colWho: 'Quién', colDetail: 'Detalle',
      kind: { confirmed: 'Confirmado', review: 'Enviado a revisión', unmatched: 'Ignorado', assigned: 'Asignado', discarded: 'Descartado', fraud: 'Marcado como fraude', reminder: 'Recordatorio enviado' },
      reminderTo: 'Recordatorio a {name}', simulated: 'Correo simulado en la demo',
      footer: 'Datos ficticios (dominios .example). La lógica que decide está cubierta por pruebas automáticas.',
      reset: 'Reiniciar demo', code: 'Código en GitHub',
      tier: { exact: 'Exacta', high: 'Alta', medium: 'Media', low: 'Baja' },
      evRead: 'Leídos del contenido y vigentes: {list}', docsNotCounted: 'No cuentan: {list}',
      notCounted: { 'too-old': 'vencido', expired: 'vencida', 'no-date': 'sin fecha', nit: 'NIT de otra empresa', low: 'dudoso', 'file-name': 'no se pudo leer' },
      nitMismatch: 'El NIT del documento no es el de {name}: no se registra solo.',
      docValid: 'Vigente', docTooOld: 'Vencido',
      docValidMeta: 'expedido el {date} · hace {n} días (máximo {max})', docTooOldMeta: 'expedido el {date}: {n} días (máximo {max}). Pedir uno nuevo',
      readBtn: 'Leer un documento', close: 'Cerrar',
      rdTitle: 'Leer un documento', rdSub: 'Sube una foto, un escaneo o un PDF y te digo qué documento es, de cuándo es y si sigue vigente. Se lee aquí mismo, en tu navegador: el archivo no se envía a ningún lado.',
      rdFile: 'Foto, escaneo o PDF', rdOr: 'O prueba con un ejemplo ficticio:', rdSupplier: 'Comparar el NIT con', rdNone: 'Ningún proveedor',
      rdSamples: ['Foto de una cámara de comercio', 'Escaneo de una certificación bancaria', 'Foto de lado de un RUT'],
      rdLoading: 'Preparando el lector (solo la primera vez, unos 9 MB)…', rdReading: 'Leyendo… {p} %', rdDone: 'Listo.',
      rdError: 'No pude leer este archivo. Prueba con una foto más nítida, de frente y con buena luz, o con el PDF.', rdType: 'Solo fotos (JPG, PNG) o PDF.',
      rdDoc: 'Documento', rdConf: 'Confianza', rdWhy: 'Por qué', rdDate: 'Fecha del documento', rdUntil: 'Vigente hasta', rdStatus: 'Estado', rdNit: 'NIT del proveedor',
      rdHow: 'Cómo se leyó', rdHowOcr: 'reconocimiento de texto (OCR)', rdTurned: '; la imagen estaba girada y se enderezó', rdHowPdfText: 'texto del PDF', rdHowPdfOcr: 'PDF escaneado: reconocimiento de texto (OCR)',
      rdAlso: 'También contiene', rdNone2: 'No reconocí el documento', rdShowText: 'Ver el texto leído', rdTextLabel: 'Texto leído del documento',
      rdNoteSample: 'Ejemplo ficticio: la antigüedad se cuenta desde la fecha de la demo ({date}).', rdNoteReal: 'La antigüedad se cuenta desde hoy ({date}). Los límites (30 días para la cámara de comercio, el RUT y la certificación bancaria) se cambian en la versión real.',
      rdYes: 'coincide', rdNo: 'NO coincide', rdNotFound: 'no aparece en el documento'
    },
    en: {
      skip: 'Skip to content', module: 'Supplier compliance', sections: 'Sections',
      viewInbox: 'Inbox', viewSuppliers: 'Suppliers', viewLog: 'Decision log', viewLogShort: 'Log', tableSup: 'Suppliers table', tableLog: 'Decisions table',
      sample: 'Sample data', how: 'How it works',
      tabReview: 'To review', tabConfirmed: 'Confirmed', tabIgnored: 'Ignored',
      searchMail: 'Search emails', searchMailPh: 'Search by sender, subject or contract',
      searchSup: 'Search suppliers', searchSupPh: 'Name or contract',
      emptyReviewTitle: 'All reviewed', emptyReview: 'No doubtful emails left. See where the suppliers stand.',
      emptyList: 'No emails in this list.', noMatch: 'No email matches the search.',
      pickMail: 'Pick an email from the list.', back: '← Back', to: 'To',
      fileDoc: 'document: {name}', fileOther: 'not a requested document',
      decision: 'Decision', needsReview: 'Needs review', autoConfirmed: 'Confirmed automatically',
      personAssigned: 'Assigned by a person', ignored: 'Ignored', discarded: 'Discarded by a person', fraud: 'Marked as fraud',
      alertSpoof: 'Gmail could not verify who sent this email.', alertSpoofMore: ' Someone may be impersonating the supplier.',
      alertBank: 'It asks to change the bank details.', alertBankMore: ' Never accepted by email: call the number already on the supplier record (not one in the email) and confirm the change.',
      alertLookalike: 'The domain @{domain} looks like a supplier\'s (@{real}) but is not the same.', alertLookalikeMore: ' A common impersonation trick.',
      evVerified: 'Gmail verified the sender (SPF/DMARC)', evUnverified: 'Gmail could not verify the sender (SPF/DMARC)',
      evBank: 'Asks to pay into another account', evDocs: 'Recognised attachments: {list}', evNoDocs: 'No attachment looks like a requested document',
      question: 'Which supplier sent this email?', optDiscard: 'None: discard', optDiscardSub: 'It stays in the log, unassigned.',
      optFraud: 'Fraud: do not accept', optFraudSub: 'Logged as fraud. Warn the supplier on its registered number.',
      optSupplierSub: '{contract} · registered: {email}', optMissing: '{n} documents missing', optComplete: 'documents up to date',
      callCheck: 'I called the number on the supplier record and they confirmed this email is theirs.',
      apply: 'Apply decision', needChoice: 'Pick an option.', needCall: 'Confirm by phone first.',
      fSupplier: 'Supplier', fConfidence: 'Confidence', fWhy: 'Why', fDocs: 'Documents', fWho: 'Decided by', fCall: 'Verified by phone',
      docsRecorded: 'Recorded: {list}', docsFiled: 'Attachments filed; not requested documents', docsNone: 'No attachments',
      you: 'You (demo)', system: 'System', yes: 'Yes', openProfile: 'Open record',
      flagSpoof: 'Possible spoofing', flagBank: 'Asks to change bank details', flagLookalike: 'Domain imitates a supplier',
      flagTie: '{n} possible suppliers', flagUnknown: 'Cites a contract from an unknown address', flagName: 'Only the name matches',
      flagWeak: 'Weak evidence', flagAuto: 'Confirmed · {name}', flagPerson: 'Assigned by you · {name}',
      flagNoSignal: 'No supplier signal', flagAutoReply: 'Automatic reply', flagDiscarded: 'Discarded by you', flagFraud: 'Marked as fraud',
      supSub: 'Status is computed from contract and document dates, not from what the sheet says.',
      simDate: 'Simulated date:', filterStatus: 'Filter by status',
      chipAll: 'All', st: { expired: 'Contract ended', 'at-risk': 'Documents overdue', expiring: 'Ends soon', active: 'Up to date' },
      colSupplier: 'Supplier', colStatus: 'Status', colEnds: 'Ends in', colDocs: 'Documents', colActivity: 'Last activity',
      endsIn: '{n} days', endedAgo: 'ended {n} days ago', noEnd: 'no date',
      actRequested: 'Requested {n} days ago', actReminded: 'reminder on {date}', actReceived: 'Received on {date}', actNever: 'Not requested',
      docShort: { rut: 'T', chamber: 'C', 'bank-letter': 'B', policy: 'P' },
      legend: 'T: tax ID (RUT) · C: chamber of commerce · B: bank letter. Green: valid · red: missing or too old · grey: not requested.',
      docsOf: '{ok} of {total} documents',
      noSuppliers: 'No supplier matches the filter.',
      fContract: 'Contract', fEnds: 'Ends', fEmail: 'Registered email', fDomain: 'Domain', sharedDomain: '{domain} (shared by {n} suppliers)',
      staleSheet: 'The sheet says “{sheet}”, but by the dates it is “{real}”.',
      secDocs: 'Documents', secMails: 'Emails from this supplier', secReminders: 'Reminders',
      docOk: 'Received', docOld: 'Old copy', docMissing: 'Missing', docNotAsked: 'Not requested', docOptional: 'Optional',
      docOkMeta: 'on {date}', docOldMeta: 'received {date}, before the request of {req}', docMissingMeta: 'requested {req}',
      noMails: 'No emails assigned.', remindedOn: 'Last: {date}', noReminder: 'None sent.',
      remind: 'Send reminder', remindSent: 'Reminder sent (simulated).',
      remindNo: 'Not needed: no overdue documents.', remindExpired: 'Contract ended: renew or close it first.', remindWait: 'One was sent {n} days ago; next one in {m} days.',
      logSub: 'Every decision, automatic or by a person, is kept with date, time and who made it.',
      colWhen: 'Date and time', colMail: 'Email', colDecision: 'Decision', colWho: 'Who', colDetail: 'Detail',
      kind: { confirmed: 'Confirmed', review: 'Sent to review', unmatched: 'Ignored', assigned: 'Assigned', discarded: 'Discarded', fraud: 'Marked as fraud', reminder: 'Reminder sent' },
      reminderTo: 'Reminder to {name}', simulated: 'Simulated email in the demo',
      footer: 'Fictional data (.example domains). The decision logic is covered by automated tests.',
      reset: 'Reset demo', code: 'Code on GitHub',
      tier: { exact: 'Exact', high: 'High', medium: 'Medium', low: 'Low' },
      evRead: 'Read from the content and valid: {list}', docsNotCounted: 'Not counted: {list}',
      notCounted: { 'too-old': 'too old', expired: 'expired', 'no-date': 'no date', nit: 'another company\'s tax ID', low: 'unclear', 'file-name': 'could not be read' },
      nitMismatch: 'The tax ID in the document is not {name}\'s: it is not recorded on its own.',
      docValid: 'Valid', docTooOld: 'Too old',
      docValidMeta: 'issued {date} · {n} days ago (maximum {max})', docTooOldMeta: 'issued {date}: {n} days (maximum {max}). Ask for a new one',
      readBtn: 'Read a document', close: 'Close',
      rdTitle: 'Read a document', rdSub: 'Upload a photo, a scan or a PDF and I will tell you which document it is, when it was issued and whether it is still valid. It is read right here, in your browser: the file is not sent anywhere.',
      rdFile: 'Photo, scan or PDF', rdOr: 'Or try a fictional example:', rdSupplier: 'Compare the tax ID with', rdNone: 'No supplier',
      rdSamples: ['Photo of a chamber of commerce certificate', 'Scan of a bank letter', 'Sideways photo of a RUT'],
      rdLoading: 'Getting the reader ready (first time only, about 9 MB)…', rdReading: 'Reading… {p}%', rdDone: 'Done.',
      rdError: 'I could not read this file. Try a sharper photo, taken straight on in good light, or the PDF.', rdType: 'Photos (JPG, PNG) or PDF only.',
      rdDoc: 'Document', rdConf: 'Confidence', rdWhy: 'Why', rdDate: 'Document date', rdUntil: 'Valid until', rdStatus: 'Status', rdNit: 'Supplier tax ID',
      rdHow: 'How it was read', rdHowOcr: 'text recognition (OCR)', rdTurned: '; the image was turned and was straightened', rdHowPdfText: 'the PDF\'s text', rdHowPdfOcr: 'scanned PDF: text recognition (OCR)',
      rdAlso: 'Also contains', rdNone2: 'Document not recognised', rdShowText: 'Show the text read', rdTextLabel: 'Text read from the document',
      rdNoteSample: 'Fictional example: age is counted from the demo date ({date}).', rdNoteReal: 'Age is counted from today ({date}). The limits (30 days for the chamber certificate, the RUT and the bank letter) are set in the real version.',
      rdYes: 'matches', rdNo: 'does NOT match', rdNotFound: 'not in the document'
    }
  };
  var DOCS_URL = {
    es: 'https://github.com/Dsergio909/supplier-radar/blob/main/docs/como-funciona.md',
    en: 'https://github.com/Dsergio909/supplier-radar/blob/main/docs/how-it-works.md'
  };
  var VIEWS = { bandeja: 'inbox', inbox: 'inbox', proveedores: 'suppliers', suppliers: 'suppliers', registro: 'log', log: 'log' };
  var ALERT_CODES = ['unverified-sender', 'bank-change', 'lookalike-domain'];
  var STATUS_CLASS = { expired: 'bad', 'at-risk': 'bad', expiring: 'warn', active: 'ok' };
  var ME = 'compras@miempresa.example';
  var DAY_MS = 86400000;

  var lang = /^en/i.test(navigator.language || '') ? 'en' : 'es';
  var state;

  // ---------- helpers ----------

  function t(key) { return I18N[lang][key]; }
  function fill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, function (_, k) { return values[k] === undefined ? '' : values[k]; });
  }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  function add(parent) {
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]);
    return parent;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
  function svgIcon(kind) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.4');
    var paths = kind === 'warn' ? ['M8 1.8 15 14H1z', 'M8 6v4M8 11.6v.4'] : ['M4 1.5h5l3 3v10H4z', 'M9 1.5v3h3'];
    paths.forEach(function (d) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
    });
    return svg;
  }

  function dayString(offsetDays) {
    return new Date(Compliance.toDay(SampleData.TODAY) + offsetDays * DAY_MS).toISOString().slice(0, 10);
  }
  function today() { return dayString(Number($('dayOffset').value)); }
  function fmtDate(day, withYear) {
    if (!day) return '';
    var d = new Date(Compliance.toDay(day));
    var opts = { day: 'numeric', month: 'short', timeZone: 'UTC' };
    if (withYear !== false) opts.year = 'numeric';
    return new Intl.DateTimeFormat(lang === 'es' ? 'es-CO' : 'en-US', opts).format(d);
  }
  function fmtStamp(stamp) { return fmtDate(stamp.day) + ', ' + stamp.time; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function nowStamp() {
    var d = new Date();
    return { day: today(), time: pad(d.getHours()) + ':' + pad(d.getMinutes()), seq: Date.now() };
  }
  function daysBetween(a, b) { return Math.round((Compliance.toDay(b) - Compliance.toDay(a)) / DAY_MS); }

  function supplierById(id) { return state.suppliers.filter(function (s) { return s.id === id; })[0]; }
  function mailById(id) { return SampleData.inbox.filter(function (m) { return m.id === id; })[0]; }
  function displayName(from) {
    var m = /^\s*"?([^"<]+?)"?\s*</.exec(from || '');
    return m ? m[1] : Classifier.senderEmail(from);
  }
  function initials(name) {
    var words = String(name).replace(/[^A-Za-zÀ-ÿ\s]/g, ' ').trim().split(/\s+/);
    return ((words[0] || '?')[0] + (words[1] ? words[1][0] : '')).toUpperCase();
  }
  function docNames(types) { return types.map(function (d) { return Messages.docName(d, lang); }).join(', '); }

  // ---------- state ----------

  // How old each document may be (days from its issue date). Every company sets its own; the real version reads them from CONFIG.
  var MAX_AGE = { rut: 30, chamber: 30, 'bank-letter': 30, 'social-security': 45, financials: 485 };
  function docRules() {
    var r = {};
    Object.keys(MAX_AGE).forEach(function (k) { r[k] = { maxAgeDays: MAX_AGE[k] }; });
    return r;
  }
  function compOpts() { return { today: today(), maxAgeDays: MAX_AGE }; }
  function byFileName(name) { return Classifier.documentTypes([name])[0] || null; }

  /** What one attachment says: its (fictional) OCR text, read on arrival, checked against the supplier's NIT. */
  function readMail(mail, supplierId) {
    var s = supplierId ? supplierById(supplierId) : null;
    return mail.attachments.map(function (file) {
      return { file: file, result: Documents.read(SampleData.documents[mail.id + '/' + file] || '', {
        today: SampleData.TODAY, rules: docRules(), supplierTaxId: s ? s.taxId : null, fileName: file, fileNameType: byFileName }) };
    });
  }
  function clearOf(reads) {
    return [].concat.apply([], (reads || []).map(function (r) { return Documents.clearDocuments(r.result); }));
  }
  /** Documents found but not counted, with a short reason. */
  function notCountedOf(reads) {
    var out = [];
    (reads || []).forEach(function (r) {
      var clear = Documents.clearDocuments(r.result);
      r.result.documents.forEach(function (d) {
        if (clear.indexOf(d) !== -1) return;
        var why = r.result.source === 'file-name' ? 'file-name' : (r.result.taxIdMatches === false ? 'nit' : (d.status !== 'ok' ? d.status : 'low'));
        out.push(Messages.docName(d.type, lang) + ' (' + (t('notCounted')[why] || why) + ')');
      });
    });
    return out;
  }

  /** Each document's date is its issue date (read from it); docsReceivedAt is when the email came. */
  function applyDocuments(supplierId, docs, arrived) {
    var s = supplierById(supplierId);
    if (!s || !docs.length) return;
    docs.forEach(function (d) {
      var updates = Compliance.documentUpdates(s, [d.type], d.issuedAt || arrived);
      delete updates.docsReceivedAt;
      Object.assign(s, updates);
    });
    var last = Compliance.toDay(s.docsReceivedAt);
    if (last === null || last < Compliance.toDay(arrived)) s.docsReceivedAt = arrived;
  }

  /** Received in the morning of the sample day, one after another. */
  function mailStamp(index) {
    var minutes = 7 * 60 + 12 + index * 29;
    return { day: SampleData.TODAY, time: pad(Math.floor(minutes / 60)) + ':' + pad(minutes % 60), seq: index };
  }

  function init(keepView) {
    var previous = state;
    state = {
      suppliers: JSON.parse(JSON.stringify(SampleData.suppliers)),
      results: {}, resolutions: {}, stamps: {}, log: [], reads: {},
      view: keepView && previous ? previous.view : 'inbox',
      tab: 'review', mailId: null, supplierId: null, filter: 'all',
      reading: false, detail: false, flash: null, note: null
    };
    // The real version runs every hour, so the demo opens with the inbox already processed.
    SampleData.inbox.forEach(function (mail, i) {
      var result = Classifier.classifyEmail(mail, state.suppliers);
      state.results[mail.id] = result;
      state.stamps[mail.id] = mailStamp(i);
      state.reads[mail.id] = readMail(mail, result.decision === 'confirmed' ? result.supplierId : null);
      if (result.decision === 'confirmed') applyDocuments(result.supplierId, clearOf(state.reads[mail.id]), SampleData.TODAY);
      state.log.push({ stamp: mailStamp(i), kind: result.decision, mailId: mail.id, supplierId: result.supplierId, who: 'system' });
    });
    state.mailId = (listFor('review')[0] || {}).id || null;
  }

  function category(mail) {
    var r = state.results[mail.id];
    var res = state.resolutions[mail.id];
    if (res) return res.kind === 'assigned' ? 'confirmed' : 'ignored';
    if (r.decision === 'review') return 'review';
    return r.decision === 'confirmed' ? 'confirmed' : 'ignored';
  }

  function matchesQuery(mail, q) {
    if (!q) return true;
    var hay = Classifier.normalize(mail.from + ' ' + mail.subject + ' ' + mail.body);
    return hay.indexOf(Classifier.normalize(q)) >= 0;
  }

  function listFor(tab, query) {
    return SampleData.inbox.filter(function (m) { return category(m) === tab && matchesQuery(m, query); });
  }

  function isAlert(result) {
    return result.decision === 'review' && ALERT_CODES.indexOf(result.reason.code) >= 0;
  }

  // ---------- rendering ----------

  function render() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (node) { node.textContent = t(node.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-label]').forEach(function (node) { node.setAttribute('aria-label', t(node.getAttribute('data-i18n-label'))); });
    document.querySelectorAll('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
    $('howLink').href = DOCS_URL[lang];
    $('mailSearch').placeholder = t('searchMailPh');
    $('supSearch').placeholder = t('searchSupPh');
    $('today').textContent = fmtDate(today());
    $('docLegend').textContent = t('legend');

    var pending = listFor('review').length;
    $('navReview').textContent = pending ? String(pending) : '';
    document.querySelectorAll('[data-view]').forEach(function (a) {
      if (a.getAttribute('data-view') === state.view) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    ['inbox', 'suppliers', 'log'].forEach(function (v) { $('view-' + v).hidden = state.view !== v; });

    if (state.view === 'inbox') renderInbox();
    if (state.view === 'suppliers') renderSuppliers();
    if (state.view === 'log') renderLog();
  }

  // ----- inbox -----

  function flagFor(mail) {
    var r = state.results[mail.id];
    var res = state.resolutions[mail.id];
    if (res) {
      if (res.kind === 'assigned') return ['ok', fill(t('flagPerson'), { name: supplierById(res.supplierId).name })];
      return res.kind === 'fraud' ? ['bad', t('flagFraud')] : ['none', t('flagDiscarded')];
    }
    if (r.decision === 'confirmed') return ['ok', fill(t('flagAuto'), { name: supplierById(r.supplierId).name })];
    if (r.decision === 'unmatched') return ['none', r.reason.code === 'auto-reply' ? t('flagAutoReply') : t('flagNoSignal')];
    var code = r.reason.code;
    if (code === 'unverified-sender') return ['bad', t('flagSpoof')];
    if (code === 'bank-change') return ['bad', t('flagBank')];
    if (code === 'lookalike-domain') return ['bad', t('flagLookalike')];
    if (code === 'tie') return ['warn', fill(t('flagTie'), { n: r.reason.count })];
    var ev = (r.evidence[0] || {}).code;
    if (ev === 'contract-unknown-sender') return ['warn', t('flagUnknown')];
    if (ev === 'name-match') return ['warn', t('flagName')];
    return ['warn', t('flagWeak')];
  }

  function renderInbox() {
    var query = $('mailSearch').value.trim();
    var counts = { review: listFor('review').length, confirmed: listFor('confirmed').length, ignored: listFor('ignored').length };
    $('cReview').textContent = counts.review;
    $('cConfirmed').textContent = counts.confirmed;
    $('cIgnored').textContent = counts.ignored;
    document.querySelectorAll('#mailTabs [data-tab]').forEach(function (b) {
      var on = b.getAttribute('data-tab') === state.tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    $('view-inbox').classList.toggle('reading', state.reading);

    var list = clear($('mailList'));
    var mails = listFor(state.tab, query);
    if (!mails.length) {
      var empty = el('li', 'empty');
      if (state.tab === 'review' && !query) {
        add(empty, el('strong', '', t('emptyReviewTitle')), el('span', '', t('emptyReview') + ' '));
        var go = el('a', '', t('viewSuppliers'));
        go.href = '#proveedores';
        empty.appendChild(go);
      } else {
        empty.textContent = query ? t('noMatch') : t('emptyList');
      }
      list.appendChild(empty);
    }
    mails.forEach(function (mail) {
      var li = el('li');
      var b = el('button', 'mail-item');
      b.type = 'button';
      if (mail.id === state.mailId) b.setAttribute('aria-current', 'true');
      var flag = flagFor(mail);
      add(b,
        add(el('span', 'mi-top'), el('span', 'mi-from', displayName(mail.from)), el('span', 'mi-time', state.stamps[mail.id].time)),
        el('span', 'mi-subject', mail.subject),
        el('span', 'mi-preview', mail.body.replace(/\s+/g, ' ')),
        el('span', 'mi-flag ' + flag[0], flag[1]));
      b.addEventListener('click', function () { openMail(mail.id); });
      li.appendChild(b);
      list.appendChild(li);
    });
    renderReading();
  }

  function openMail(id) {
    state.mailId = id;
    state.reading = true;
    render();
    $('readPane').focus();
  }

  function renderReading() {
    var pane = clear($('readPane'));
    var mail = state.mailId && mailById(state.mailId);
    if (!mail || category(mail) !== state.tab) {
      pane.appendChild(el('p', 'empty', t('pickMail')));
      return;
    }
    var result = state.results[mail.id];
    var stamp = state.stamps[mail.id];

    var back = el('button', 'btn back', t('back'));
    back.type = 'button';
    back.addEventListener('click', function () { state.reading = false; render(); });
    pane.appendChild(back);
    pane.appendChild(el('h2', 'mail-subject', mail.subject));

    var name = displayName(mail.from);
    var addr = Classifier.senderEmail(mail.from);
    var who = el('div');
    add(who, el('span', 'sender-name', name), document.createTextNode(' '),
      name !== addr ? el('span', 'sender-addr', '<' + addr + '>') : null,
      el('div', 'sender-meta', fmtStamp(stamp) + ' · ' + t('to') + ': ' + ME));
    pane.appendChild(add(el('div', 'sender'), el('span', 'avatar', initials(name)), who));

    if (mail.attachments.length) {
      var files = el('ul', 'files read');
      var owner = (state.resolutions[mail.id] || {}).supplierId || (result.decision === 'confirmed' ? result.supplierId : null);
      (state.reads[mail.id] || []).forEach(function (r) { files.appendChild(fileCard(r, owner)); });
      pane.appendChild(files);
    }
    pane.appendChild(el('div', 'mail-body', mail.body));
    pane.appendChild(decisionPanel(mail, result));
  }

  /** An attachment and what reading it found: which document, its date, whether it counts and why. */
  function fileCard(r, ownerId) {
    var res = r.result;
    var clear = Documents.clearDocuments(res);
    var li = add(el('li', 'file'), add(el('div', 'file-head'), svgIcon('file'), el('span', 'file-name', r.file)));
    var docs = res.documents.length ? res.documents : [null];
    docs.forEach(function (d) {
      var cls = d ? (clear.indexOf(d) !== -1 ? 'ok' : 'warn') : (res.status === 'not-registration' ? 'none' : 'warn');
      var text = d ? Messages.docName(d.type, lang) + ': ' + Messages.documentStatus(d, lang)
        : (res.type ? Messages.docName(res.type, lang) + ': ' : '') + Messages.documentStatus(res, lang);
      li.appendChild(el('span', 'file-kind st ' + cls, text));
    });
    var why = Messages.documentEvidence(res.source, res.evidence, lang);
    if (why) li.appendChild(el('span', 'file-why', why.charAt(0).toUpperCase() + why.slice(1)));
    if (res.taxIdMatches === false && ownerId) li.appendChild(el('span', 'file-why bad', fill(t('nitMismatch'), { name: supplierById(ownerId).name })));
    return li;
  }

  function evidenceList(mail, result, candidate) {
    var ul = el('ul', 'evidence');
    function item(mark, text) {
      var sentence = text.charAt(0).toUpperCase() + text.slice(1);
      ul.appendChild(add(el('li'), el('span', mark === '✓' ? 'mark-ok' : (mark === '✕' ? 'mark-no' : 'mark-info'), mark), el('span', '', sentence)));
    }
    (candidate ? candidate.evidence : result.evidence).forEach(function (e) {
      item(e.code === 'imitated-domain' ? '✕' : '✓', Messages.format(e, lang));
    });
    item(mail.senderVerified === false ? '✕' : '✓', mail.senderVerified === false ? t('evUnverified') : t('evVerified'));
    if (result.bankChange) item('✕', t('evBank'));
    if (mail.attachments.length) {
      var good = clearOf(state.reads[mail.id]);
      item(good.length ? '✓' : '·', good.length ? fill(t('evRead'), { list: docNames(good.map(function (d) { return d.type; })) }) : t('evNoDocs'));
    }
    return ul;
  }

  function alertBox(result) {
    var lines = [];
    if (result.reason.code === 'unverified-sender') lines.push([t('alertSpoof'), t('alertSpoofMore')]);
    if (result.bankChange) lines.push([t('alertBank'), t('alertBankMore')]);
    if (result.reason.code === 'lookalike-domain') {
      var ev = result.evidence[0] || {};
      lines.push([fill(t('alertLookalike'), { domain: ev.domain, real: ev.real }), t('alertLookalikeMore')]);
    }
    if (!lines.length) return null;
    var box = el('div', 'alert');
    box.setAttribute('role', 'note');
    var text = el('div');
    lines.forEach(function (l, i) {
      if (i) text.appendChild(el('br'));
      add(text, el('strong', '', l[0]), document.createTextNode(l[1]));
    });
    return add(box, svgIcon('warn'), text);
  }

  function decisionPanel(mail, result) {
    var box = el('section', 'decision');
    box.setAttribute('aria-labelledby', 'decisionTitle');
    var head = el('div', 'decision-head');
    var title = el('h2', '', t('decision'));
    title.id = 'decisionTitle';
    head.appendChild(title);
    box.appendChild(head);

    var res = state.resolutions[mail.id];
    if (result.decision !== 'review' || res) {
      var label, cls;
      if (res) { label = res.kind === 'assigned' ? t('personAssigned') : t(res.kind === 'fraud' ? 'fraud' : 'discarded'); cls = res.kind === 'assigned' ? 'ok' : (res.kind === 'fraud' ? 'bad' : 'none'); }
      else if (result.decision === 'confirmed') { label = t('autoConfirmed'); cls = 'ok'; }
      else { label = t('ignored'); cls = 'none'; }
      head.appendChild(el('span', 'st ' + cls, label));
      box.appendChild(outcome(mail, result, res));
      return box;
    }

    var alert = isAlert(result);
    head.appendChild(el('span', 'st ' + (alert ? 'bad' : 'warn'), t('needsReview')));
    var warning = alertBox(result);
    if (warning) box.appendChild(warning);
    box.appendChild(evidenceList(mail, result, null));

    var fs = el('fieldset', 'question');
    // The alert and the evidence above already explain risky cases; ties and weak evidence get one line.
    var hint = alert ? null : Messages.format(result.reason, lang);
    add(fs, el('legend', '', t('question')), hint ? el('p', 'hint', hint.charAt(0).toUpperCase() + hint.slice(1) + '.') : null);
    var name = 'choice-' + mail.id;
    var options = result.candidates.map(function (c) {
      var s = supplierById(c.supplierId);
      var missing = Compliance.missingDocuments(s, compOpts()).length;
      return {
        value: c.supplierId, title: s.name,
        sub: fill(t('optSupplierSub'), { contract: s.contractId, email: s.emails[0] || '—' }) + ' · ' +
          (missing ? fill(t('optMissing'), { n: missing }) : t('optComplete'))
      };
    });
    options.push({ value: 'discard', title: t('optDiscard'), sub: t('optDiscardSub') });
    if (alert) options.push({ value: 'fraud', title: t('optFraud'), sub: t('optFraudSub') });
    options.forEach(function (o) {
      var label = el('label', 'option');
      var input = el('input');
      input.type = 'radio';
      input.name = name;
      input.value = o.value;
      add(label, input, add(el('span'), el('span', 'option-title', o.title), el('span', 'option-sub', o.sub)));
      fs.appendChild(label);
    });
    box.appendChild(fs);

    var call = null;
    if (alert) {
      call = el('label', 'callcheck');
      var cb = el('input');
      cb.type = 'checkbox';
      add(call, cb, el('span', '', t('callCheck')));
      box.appendChild(call);
    }

    var actions = el('div', 'decision-actions');
    var apply = el('button', 'btn primary', t('apply'));
    apply.type = 'button';
    var note = el('span', 'decision-note');
    note.setAttribute('aria-live', 'polite');
    add(actions, apply, note);
    box.appendChild(actions);

    function current() {
      var chosen = fs.querySelector('input:checked');
      return chosen ? chosen.value : null;
    }
    function validate() {
      var choice = current();
      var needsCall = alert && choice && choice !== 'discard' && choice !== 'fraud';
      var called = call ? call.querySelector('input').checked : false;
      var ok = !!choice && (!needsCall || called);
      apply.disabled = !ok;
      note.textContent = !choice ? t('needChoice') : (needsCall && !called ? t('needCall') : '');
    }
    box.addEventListener('change', validate);
    apply.addEventListener('click', function () {
      var choice = current();
      if (!choice) return;
      resolve(mail, choice, call ? call.querySelector('input').checked : false);
    });
    validate();
    return box;
  }

  function outcome(mail, result, res) {
    var dl = el('dl', 'outcome');
    function row(k, v) { if (v) dl.appendChild(add(el('div'), el('dt', '', k), add(el('dd'), v))); }
    var supplierId = res ? res.supplierId : result.supplierId;
    if (supplierId) {
      var link = el('a', '', supplierById(supplierId).name);
      link.href = '#proveedores';
      link.addEventListener('click', function () { state.supplierId = supplierId; state.detail = true; });
      row(t('fSupplier'), link);
    }
    if (!res && result.tier) row(t('fConfidence'), document.createTextNode(t('tier')[result.tier]));
    row(t('fWhy'), document.createTextNode(Messages.explain(result, lang)));
    if (res) {
      row(t('fWho'), document.createTextNode(t('you') + ' · ' + fmtStamp(res.stamp)));
      if (res.called) row(t('fCall'), document.createTextNode(t('yes')));
    }
    if (supplierId && (!res || res.kind === 'assigned')) {
      var reads = state.reads[mail.id];
      var good = clearOf(reads);
      var notCounted = notCountedOf(reads);
      var parts = [];
      if (good.length) parts.push(fill(t('docsRecorded'), { list: docNames(good.map(function (d) { return d.type; })) }));
      if (notCounted.length) parts.push(fill(t('docsNotCounted'), { list: notCounted.join(', ') }));
      var docs = !mail.attachments.length ? t('docsNone') : (parts.length ? parts.join(' · ') : t('docsFiled'));
      row(t('fDocs'), document.createTextNode(docs));
    }
    return dl;
  }

  function resolve(mail, choice, called) {
    var stamp = nowStamp();
    var kind = choice === 'discard' ? 'discarded' : (choice === 'fraud' ? 'fraud' : 'assigned');
    var supplierId = kind === 'assigned' ? choice : null;
    var result = state.results[mail.id];
    state.resolutions[mail.id] = { kind: kind, supplierId: supplierId, called: called, stamp: stamp };
    if (supplierId) {
      state.reads[mail.id] = readMail(mail, supplierId);
      applyDocuments(supplierId, clearOf(state.reads[mail.id]), today());
    }
    state.log.push({ stamp: stamp, kind: kind, mailId: mail.id, supplierId: supplierId, who: 'person', called: called });
    var next = listFor('review')[0];
    state.mailId = next ? next.id : null;
    state.reading = !!next && state.reading;
    render();
    var focusTarget = document.querySelector('.mail-item[aria-current="true"]') || $('mailList');
    if (focusTarget && focusTarget.focus) focusTarget.focus();
  }

  // ----- suppliers -----

  function docCells(s) {
    var wrap = el('span', 'docs');
    var list = Compliance.documentChecklist(s, compOpts()).filter(function (d) { return d.required; });
    var requested = !!s.docsRequestedAt;
    var ok = 0;
    list.forEach(function (d) {
      var cls = d.ok ? 'y' : (requested || d.tooOld ? 'n' : 'p');
      if (d.ok) ok++;
      var cell = el('span', 'd ' + cls, t('docShort')[d.type]);
      cell.title = Messages.docName(d.type, lang) + ': ' + (d.ok ? t('docValid') : (d.tooOld ? t('docTooOld') : (requested ? t('docMissing') : t('docNotAsked'))));
      cell.setAttribute('aria-hidden', 'true');
      wrap.appendChild(cell);
    });
    wrap.appendChild(el('span', 'sr-only', fill(t('docsOf'), { ok: ok, total: list.length })));
    return wrap;
  }

  function activity(s, row) {
    var req = s.docsRequestedAt;
    if (!req) return t('actNever');
    if (row.missing.length) {
      var text = fill(t('actRequested'), { n: daysBetween(req, today()) });
      if (s.remindedAt) text += ' · ' + fill(t('actReminded'), { date: fmtDate(s.remindedAt, false) });
      return text;
    }
    return fill(t('actReceived'), { date: fmtDate(s.docsReceivedAt, false) });
  }

  function endsText(daysLeft) {
    if (daysLeft === null) return t('noEnd');
    return daysLeft < 0 ? fill(t('endedAgo'), { n: -daysLeft }) : fill(t('endsIn'), { n: daysLeft });
  }

  function renderSuppliers() {
    var summary = Compliance.summarize(state.suppliers, today(), compOpts());
    $('view-suppliers').classList.toggle('detail', state.detail);

    var chips = clear($('statusChips'));
    [['all', t('chipAll'), summary.total]].concat(Compliance.STATUSES.map(function (s) {
      return [s, t('st')[s], summary.counts[s]];
    })).forEach(function (c) {
      var b = el('button', '', c[1] + ' ' + c[2]);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(state.filter === c[0]));
      b.addEventListener('click', function () { state.filter = c[0]; render(); });
      chips.appendChild(b);
    });

    var q = Classifier.normalize($('supSearch').value.trim());
    var rows = summary.rows.filter(function (r) {
      return (state.filter === 'all' || r.status === state.filter) &&
        (!q || Classifier.normalize(r.supplier.name + ' ' + r.supplier.contractId).indexOf(q) >= 0);
    });
    if (!state.supplierId || !supplierById(state.supplierId)) state.supplierId = (rows[0] || summary.rows[0]).supplier.id;

    var body = clear($('supRows'));
    if (!rows.length) {
      var tr0 = el('tr');
      var td0 = el('td', 'empty', t('noSuppliers'));
      td0.colSpan = 5;
      body.appendChild(add(tr0, td0));
    }
    rows.forEach(function (row) {
      var s = row.supplier;
      var tr = el('tr');
      tr.tabIndex = 0;
      tr.setAttribute('aria-selected', String(s.id === state.supplierId));
      if (state.flash === s.id) tr.className = 'flash';
      add(tr,
        add(el('td'), el('span', 'sname', s.name), el('span', 'scontract', s.contractId),
          el('span', 'st st-inline ' + STATUS_CLASS[row.status], t('st')[row.status])),
        add(el('td'), el('span', 'st ' + STATUS_CLASS[row.status], t('st')[row.status])),
        el('td', 'num', endsText(row.daysLeft)),
        add(el('td'), docCells(s)),
        el('td', 'muted', activity(s, row)));
      function select() { state.supplierId = s.id; state.detail = true; state.note = null; render(); $('supDetail').focus(); }
      tr.addEventListener('click', select);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
      body.appendChild(tr);
    });
    state.flash = null;
    renderDetail(summary);
  }

  function renderDetail(summary) {
    var pane = clear($('supDetail'));
    var row = summary.rows.filter(function (r) { return r.supplier.id === state.supplierId; })[0];
    if (!row) return;
    var s = row.supplier;

    var head = el('div', 'dp-head');
    var back = el('button', 'btn back', t('back'));
    back.type = 'button';
    back.addEventListener('click', function () { state.detail = false; render(); });
    var reason = Messages.format(row.reason, lang);
    add(head, back, el('h2', '', s.name), el('span', 'st ' + STATUS_CLASS[row.status], reason.charAt(0).toUpperCase() + reason.slice(1)));

    var shared = state.suppliers.filter(function (o) { return o.domain && o.domain === s.domain; }).length;
    var facts = el('dl', 'facts');
    [[t('fContract'), s.contractId],
      [t('fEnds'), s.contractEnd ? fmtDate(s.contractEnd) + ' (' + endsText(row.daysLeft) + ')' : t('noEnd')],
      [t('fEmail'), s.emails.join(', ') || '—'],
      [t('fDomain'), s.domain ? (shared > 1 ? fill(t('sharedDomain'), { domain: s.domain, n: shared }) : s.domain) : '—']
    ].forEach(function (f) { facts.appendChild(add(el('div'), el('dt', '', f[0]), el('dd', '', f[1]))); });
    head.appendChild(facts);
    if (row.staleManualStatus) {
      head.appendChild(el('p', 'stale-note', fill(t('staleSheet'), { sheet: t('st')[s.manualStatus] || s.manualStatus, real: t('st')[row.status] })));
    }
    pane.appendChild(head);

    var docs = add(el('section', 'dp-section'), el('h3', '', t('secDocs')));
    Compliance.documentChecklist(s, compOpts()).forEach(function (d) {
      var label, cls, meta;
      if (d.tooOld) { label = t('docTooOld'); cls = 'bad'; meta = fill(t('docTooOldMeta'), { date: fmtDate(d.receivedAt), n: d.ageDays, max: MAX_AGE[d.type] }); }
      else if (d.ok && d.ageDays !== null) { label = t('docValid'); cls = 'ok'; meta = fill(t('docValidMeta'), { date: fmtDate(d.receivedAt), n: d.ageDays, max: MAX_AGE[d.type] }); }
      else if (d.ok) { label = t('docOk'); cls = 'ok'; meta = fill(t('docOkMeta'), { date: fmtDate(d.receivedAt) }); }
      else if (!d.required) { label = t('docOptional'); cls = 'none'; meta = fill(t('docOkMeta'), { date: fmtDate(d.receivedAt) }); }
      else if (d.receivedAt) { label = t('docOld'); cls = 'warn'; meta = fill(t('docOldMeta'), { date: fmtDate(d.receivedAt), req: fmtDate(s.docsRequestedAt) }); }
      else if (s.docsRequestedAt) { label = t('docMissing'); cls = 'bad'; meta = fill(t('docMissingMeta'), { req: fmtDate(s.docsRequestedAt) }); }
      else { label = t('docNotAsked'); cls = 'none'; meta = ''; }
      docs.appendChild(add(el('div', 'doc-row'), el('span', 'doc-name', Messages.docName(d.type, lang)), el('span', 'st ' + cls, label), meta ? el('span', 'doc-meta', meta) : null));
    });
    var tryDoc = el('button', 'btn small', t('readBtn'));
    tryDoc.type = 'button';
    tryDoc.addEventListener('click', function () { openReader(s.id); });
    docs.appendChild(add(el('p', 'doc-try'), tryDoc));
    pane.appendChild(docs);

    var mails = SampleData.inbox.filter(function (m) {
      var r = state.results[m.id];
      var res = state.resolutions[m.id];
      return res ? res.supplierId === s.id : (r.decision === 'confirmed' && r.supplierId === s.id);
    });
    var mailSec = add(el('section', 'dp-section'), el('h3', '', t('secMails')));
    if (!mails.length) mailSec.appendChild(el('p', 'muted', t('noMails')));
    else {
      var ul = el('ul', 'mini-list');
      mails.forEach(function (m) {
        var a = el('a', '', m.subject);
        a.href = '#bandeja';
        a.addEventListener('click', function () { state.tab = category(m); state.mailId = m.id; state.reading = true; });
        ul.appendChild(add(el('li'), a, el('span', 'muted', ' · ' + fmtStamp(state.stamps[m.id]))));
      });
      mailSec.appendChild(ul);
    }
    pane.appendChild(mailSec);

    var rem = add(el('section', 'dp-section'), el('h3', '', t('secReminders')),
      el('p', 'muted', s.remindedAt ? fill(t('remindedOn'), { date: fmtDate(s.remindedAt) }) : t('noReminder')));
    pane.appendChild(rem);

    var actions = el('div', 'dp-actions');
    var btn = el('button', 'btn primary', t('remind'));
    btn.type = 'button';
    var can = Compliance.needsReminder(s, today(), compOpts());
    btn.disabled = !can;
    var note = el('span', 'decision-note');
    note.setAttribute('aria-live', 'polite');
    if (state.note && state.note.id === s.id) note.textContent = state.note.text;
    else if (!can && row.status === 'expired') note.textContent = t('remindExpired');
    else if (!can && row.status !== 'at-risk') note.textContent = t('remindNo');
    else if (!can && s.remindedAt) {
      var ago = daysBetween(s.remindedAt, today());
      note.textContent = fill(t('remindWait'), { n: ago, m: Math.max(0, Compliance.DEFAULTS.reminderEveryDays - ago) });
    }
    btn.addEventListener('click', function () {
      s.remindedAt = today();
      state.log.push({ stamp: nowStamp(), kind: 'reminder', supplierId: s.id, who: 'person' });
      state.note = { id: s.id, text: t('remindSent') };
      state.flash = s.id;
      render();
    });
    pane.appendChild(add(actions, btn, note));
  }

  // ----- log -----

  function renderLog() {
    var body = clear($('logRows'));
    state.log.slice().sort(function (a, b) {
      return (a.stamp.day < b.stamp.day ? 1 : a.stamp.day > b.stamp.day ? -1 : 0) || (b.stamp.time > a.stamp.time ? 1 : b.stamp.time < a.stamp.time ? -1 : 0) || b.stamp.seq - a.stamp.seq;
    }).forEach(function (entry) {
      var mail = entry.mailId && mailById(entry.mailId);
      var supplier = entry.supplierId && supplierById(entry.supplierId);
      var mailCell = el('td');
      if (mail) add(mailCell, el('span', 'sname', displayName(mail.from)), el('span', 'scontract', mail.subject));
      else mailCell.textContent = fill(t('reminderTo'), { name: supplier ? supplier.name : '' });
      var detail;
      if (entry.kind === 'reminder') detail = t('simulated');
      else if (entry.who === 'system') detail = Messages.explain(state.results[entry.mailId], lang);
      else detail = entry.called ? t('fCall') + ': ' + t('yes') : '';
      var whoCell = el('td', entry.who === 'person' ? 'who-person' : '', entry.who === 'person' ? t('you') : t('system'));
      body.appendChild(add(el('tr'),
        el('td', '', fmtStamp(entry.stamp)), mailCell,
        el('td', '', t('kind')[entry.kind]),
        el('td', '', supplier ? supplier.name : '—'), whoCell, el('td', 'muted', detail)));
    });
  }

  // ---------- routing and wiring ----------

  // ----- read a document (photo, scan or PDF), in the browser -----

  var SAMPLES = ['samples/IMG_20260927_101533.jpg', 'samples/escaneo_001.jpg', 'samples/WhatsApp_Image_2026-09-28.jpg'];
  var reader = { busy: false, supplierId: '' };

  function localToday() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function openReader(supplierId) {
    reader.supplierId = supplierId || '';
    var sel = clear($('rdSupplier'));
    var none = el('option', '', t('rdNone'));
    none.value = '';
    sel.appendChild(none);
    state.suppliers.forEach(function (s) {
      var o = el('option', '', s.name);
      o.value = s.id;
      sel.appendChild(o);
    });
    sel.value = reader.supplierId;
    var samples = clear($('rdSamples'));
    SAMPLES.forEach(function (url, i) {
      var b = el('button', 'btn small', t('rdSamples')[i]);
      b.type = 'button';
      b.addEventListener('click', function () { readWith(window.RadarOcr && window.RadarOcr.readUrl(url, progress), true); });
      samples.appendChild(b);
    });
    clear($('rdResult'));
    $('rdStatus').textContent = '';
    $('rdFile').value = '';
    if (!$('reader').open) $('reader').showModal();
  }

  function progress(status, value) {
    $('rdStatus').textContent = /recogniz/.test(status) ? fill(t('rdReading'), { p: Math.round(value * 100) }) : t('rdLoading');
  }

  function readWith(promise, sample) {
    if (reader.busy || !promise) return;
    reader.busy = true;
    $('reader').setAttribute('aria-busy', 'true');
    clear($('rdResult'));
    $('rdStatus').textContent = t('rdLoading');
    promise.then(function (out) {
      var day = sample ? SampleData.TODAY : localToday();
      var s = reader.supplierId ? supplierById(reader.supplierId) : null;
      var res = Documents.readAll(out.texts || [out.text], { today: day, rules: docRules(), supplierTaxId: s ? s.taxId : null });
      $('rdStatus').textContent = t('rdDone');
      showReading(res, out, sample, day, s);
    }, function (err) {
      $('rdStatus').textContent = err && err.message === 'type' ? t('rdType') : t('rdError');
    }).then(function () {
      reader.busy = false;
      $('reader').removeAttribute('aria-busy');
    });
  }

  function showReading(res, out, sample, day, supplier) {
    var box = clear($('rdResult'));
    var dl = el('dl', 'outcome rd-out');
    function row(k, v, cls) { if (v) dl.appendChild(add(el('div'), el('dt', '', k), el('dd', cls || '', v))); }
    var main = res.documents[0];
    row(t('rdDoc'), res.type ? Messages.docName(res.type, lang) : t('rdNone2'));
    if (res.documents.length > 1) {
      row(t('rdAlso'), res.documents.slice(1).map(function (d) { return Messages.docName(d.type, lang) + ' (' + Messages.documentStatus(d, lang) + ')'; }).join(' · '));
    }
    if (res.type) row(t('rdConf'), t('tier')[res.confidence]);
    var why = Messages.documentEvidence(res.source, res.evidence, lang);
    if (why) row(t('rdWhy'), why.charAt(0).toUpperCase() + why.slice(1));
    if (main && main.issuedAt) row(t('rdDate'), fmtDate(main.issuedAt));
    if (main && main.validUntil) row(t('rdUntil'), fmtDate(main.validUntil));
    var status = main ? Messages.documentStatus(main, lang) : Messages.documentStatus(res, lang);
    var ok = main && main.status === 'ok' && res.taxIdMatches !== false;
    row(t('rdStatus'), status.charAt(0).toUpperCase() + status.slice(1), 'st ' + (ok ? 'ok' : (res.status === 'not-registration' ? 'none' : 'bad')));
    if (supplier) row(t('rdNit'), res.taxIdMatches === null ? t('rdNotFound') : (res.taxIdMatches ? t('rdYes') : t('rdNo')), res.taxIdMatches === false ? 'st bad' : '');
    var how = out.how === 'pdf-text' ? t('rdHowPdfText') : (out.how === 'pdf-ocr' ? t('rdHowPdfOcr') : t('rdHowOcr') + (out.quarter ? t('rdTurned') : ''));
    row(t('rdHow'), how);
    box.appendChild(dl);
    box.appendChild(el('p', 'muted small', fill(t(sample ? 'rdNoteSample' : 'rdNoteReal'), { date: fmtDate(day) })));
    var details = add(el('details', 'rd-text'), el('summary', '', t('rdShowText')));
    var pre = el('pre', '', out.text.trim());
    pre.tabIndex = 0;
    pre.setAttribute('aria-label', t('rdTextLabel'));
    details.appendChild(pre);
    box.appendChild(details);
  }

  $('readerOpen').addEventListener('click', function () { openReader(''); });
  $('rdClose').addEventListener('click', function () { $('reader').close(); });
  $('rdSupplier').addEventListener('change', function () { reader.supplierId = $('rdSupplier').value; });
  $('rdFile').addEventListener('change', function () {
    var f = $('rdFile').files[0];
    if (f) readWith(window.RadarOcr && window.RadarOcr.readFile(f, progress), false);
  });


  function route() {
    var key = (location.hash || '').replace('#', '').toLowerCase();
    state.view = VIEWS[key] || 'inbox';
    render();
  }

  document.querySelectorAll('#mailTabs [data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.tab = b.getAttribute('data-tab');
      var first = listFor(state.tab, $('mailSearch').value.trim())[0];
      state.mailId = first ? first.id : null;
      state.reading = false;
      render();
    });
  });
  $('mailTabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var tabs = ['review', 'confirmed', 'ignored'];
    var i = (tabs.indexOf(state.tab) + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
    state.tab = tabs[i];
    var first = listFor(state.tab)[0];
    state.mailId = first ? first.id : null;
    render();
    document.querySelector('#mailTabs [data-tab="' + state.tab + '"]').focus();
  });
  $('mailSearch').addEventListener('input', render);
  $('supSearch').addEventListener('input', render);
  $('dayOffset').addEventListener('input', function () { state.note = null; render(); });
  $('reset').addEventListener('click', function () { $('dayOffset').value = 0; $('mailSearch').value = ''; $('supSearch').value = ''; init(true); render(); });
  document.querySelectorAll('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () { lang = b.getAttribute('data-lang'); render(); });
  });
  window.addEventListener('hashchange', route);

  init(false);
  route();
})();
