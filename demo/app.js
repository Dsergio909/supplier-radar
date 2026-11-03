/* Supplier Radar demo — UI only. Every decision comes from src/core. */
(function () {
  'use strict';

  var I18N = {
    es: {
      tagline: 'Compras · Cumplimiento de proveedores',
      howLink: 'Cómo funciona',
      sampleData: 'Demo · datos ficticios',
      intro: 'Clasifica las respuestas de los proveedores por nivel de confianza. Lo seguro se confirma solo; lo dudoso lo decide una persona. El estado sale de las fechas.',
      step1: 'Procesar bandeja', step2: 'Resolver casos dudosos', step3: 'Monitorear proveedores',
      inbox: 'Bandeja de entrada', process: 'Procesar bandeja', reset: 'Reiniciar',
      inboxIdle: '{n} correos sin procesar', inboxBusy: 'Procesando {i} de {n}…', inboxDone: 'Confirmados: {c} · A revisión: {r} · Ignorados: {u}',
      review: 'Cola de revisión',
      reviewHint: 'El sistema no adivina: muestra la evidencia y una persona decide.',
      reviewEmptyTitle: 'Sin pendientes',
      reviewEmpty: 'Procesa la bandeja. Aquí llegan los correos que no se pueden asignar con seguridad.',
      reviewDone: 'Todos los casos dudosos están resueltos.',
      suppliers: 'Proveedores',
      suppliersHint: 'Ordenados por urgencia. El estado se calcula con fechas, no con lo escrito en la hoja.',
      simDate: 'Fecha simulada:', clockHint: 'Mueve la barra para adelantar el tiempo.',
      colSupplier: 'Proveedor', colStatus: 'Estado', colDays: 'Días contrato', colDocs: 'Documentos',
      colReason: 'Motivo', colManual: 'Estado en la hoja',
      howTitle: 'Reglas de confianza', howSub: 'Cómo decide el sistema si un correo es de un proveedor.',
      colTier: 'Nivel', colCondition: 'Condición', colAction: 'Acción',
      tierExact: 'Remitente registrado y número de contrato en el correo.',
      tierHigh: 'Remitente registrado.',
      tierMedium: 'Dominio corporativo del proveedor (nunca Gmail u Hotmail).',
      tierLow: 'Solo un nombre parecido, o un número de contrato desde un correo desconocido.',
      actConfirm: 'Confirma', actUnique: 'Confirma si es único', actReview: 'Revisión humana',
      footer: 'Datos ficticios · la lógica de src/core está cubierta por pruebas automáticas',
      kpi: { expired: 'Vencidos', 'at-risk': 'En riesgo', expiring: 'Por vencer · 30 días', active: 'Al día' },
      status: { expired: 'Vencido', 'at-risk': 'En riesgo', expiring: 'Por vencer', active: 'Al día' },
      decision: { confirmed: 'Confirmado', review: 'A revisión', unmatched: 'Ignorado' },
      spoof: 'Posible suplantación',
      conf: 'Confianza', tier: { exact: 'Exacta', high: 'Alta', medium: 'Media', low: 'Baja' },
      assign: 'Asignar a', discard: 'Descartar', stale: 'desactualizado',
      docsReceived: 'Recibidos', docsRequested: 'Solicitados', docsNone: 'Sin solicitar',
      themeDark: 'Cambiar a modo oscuro', themeLight: 'Cambiar a modo claro'
    },
    en: {
      tagline: 'Procurement · Supplier compliance',
      howLink: 'How it works',
      sampleData: 'Demo · fictional data',
      intro: 'Classifies supplier replies by confidence. Safe matches are confirmed automatically; doubtful ones go to a person. Status comes from dates.',
      step1: 'Process inbox', step2: 'Resolve doubtful cases', step3: 'Monitor suppliers',
      inbox: 'Inbox', process: 'Process inbox', reset: 'Reset',
      inboxIdle: '{n} unprocessed emails', inboxBusy: 'Processing {i} of {n}…', inboxDone: 'Confirmed: {c} · To review: {r} · Ignored: {u}',
      review: 'Review queue',
      reviewHint: 'The system does not guess: it shows the evidence and a person decides.',
      reviewEmptyTitle: 'Nothing pending',
      reviewEmpty: 'Process the inbox. Emails that cannot be matched safely land here.',
      reviewDone: 'Every doubtful case is resolved.',
      suppliers: 'Suppliers',
      suppliersHint: 'Sorted by urgency. Status is computed from dates, not from what the sheet says.',
      simDate: 'Simulated date:', clockHint: 'Drag to move time forward.',
      colSupplier: 'Supplier', colStatus: 'Status', colDays: 'Contract days', colDocs: 'Documents',
      colReason: 'Reason', colManual: 'Status in sheet',
      howTitle: 'Confidence rules', howSub: 'How the system decides whether an email comes from a supplier.',
      colTier: 'Tier', colCondition: 'Condition', colAction: 'Action',
      tierExact: 'Registered sender and contract number in the email.',
      tierHigh: 'Registered sender.',
      tierMedium: 'Supplier corporate domain (never Gmail or Hotmail).',
      tierLow: 'Only a similar name, or a contract number from an unknown address.',
      actConfirm: 'Confirm', actUnique: 'Confirm if unique', actReview: 'Human review',
      footer: 'Fictional data · the logic in src/core is covered by automated tests',
      kpi: { expired: 'Expired', 'at-risk': 'At risk', expiring: 'Expiring · 30 days', active: 'Up to date' },
      status: { expired: 'Expired', 'at-risk': 'At risk', expiring: 'Expiring', active: 'Up to date' },
      decision: { confirmed: 'Confirmed', review: 'To review', unmatched: 'Ignored' },
      spoof: 'Possible spoofing',
      conf: 'Confidence', tier: { exact: 'Exact', high: 'High', medium: 'Medium', low: 'Low' },
      assign: 'Assign to', discard: 'Discard', stale: 'stale',
      docsReceived: 'Received', docsRequested: 'Requested', docsNone: 'Not requested',
      themeDark: 'Switch to dark mode', themeLight: 'Switch to light mode'
    }
  };
  var KPI_COLORS = { expired: 'var(--bad)', 'at-risk': 'var(--risk)', expiring: 'var(--warn)', active: 'var(--ok)' };
  var DOCS_URL = {
    es: 'https://github.com/Dsergio909/supplier-radar/blob/main/docs/como-funciona.md',
    en: 'https://github.com/Dsergio909/supplier-radar/blob/main/docs/how-it-works.md'
  };
  var DAY_MS = 86400000;
  var FLASH_MS = 1800;
  var STEP_MS = 260;

  var lang = /^en/i.test(navigator.language || '') ? 'en' : 'es';
  var state;

  function t(key) { return I18N[lang][key]; }
  function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, function (_, k) { return values[k]; });
  }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // ---------- theme (remembered per browser when storage is available) ----------

  function storedTheme() {
    try { return localStorage.getItem('sr-theme'); } catch (e) { return null; }
  }
  function isDark() {
    var forced = document.documentElement.getAttribute('data-theme');
    if (forced) return forced === 'dark';
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('sr-theme', theme); } catch (e) { /* storage blocked: theme lasts this visit */ }
    render();
  }

  // ---------- state ----------

  function reset() {
    state = {
      suppliers: JSON.parse(JSON.stringify(SampleData.suppliers)),
      results: {},
      resolved: {},
      flashUntil: {},
      scanning: null,
      processing: false,
      processedCount: 0
    };
    render();
  }

  function today() {
    var base = Compliance.toDay(SampleData.TODAY);
    return new Date(base + Number($('dayOffset').value) * DAY_MS).toISOString().slice(0, 10);
  }

  function supplierById(id) {
    return state.suppliers.filter(function (s) { return s.id === id; })[0];
  }

  function recordDocuments(supplierId) {
    supplierById(supplierId).docsReceivedAt = today();
    state.flashUntil[supplierId] = Date.now() + FLASH_MS;
  }

  function pendingReview() {
    return SampleData.inbox.filter(function (m) {
      var r = state.results[m.id];
      return r && r.decision === 'review' && !state.resolved[m.id];
    });
  }

  function allProcessed() {
    return SampleData.inbox.every(function (m) { return state.results[m.id]; });
  }

  // ---------- actions ----------

  function processInbox() {
    if (state.processing) return;
    var run = state;
    run.processing = true;
    var queue = SampleData.inbox.filter(function (m) { return !run.results[m.id]; });
    var delay = reducedMotion() ? 0 : STEP_MS;

    (function step() {
      if (state !== run) return; // reset while processing
      var mail = queue.shift();
      run.scanning = mail ? mail.id : null;
      if (!mail) {
        run.processing = false;
        render();
        return;
      }
      render();
      setTimeout(function () {
        if (state !== run) return;
        var result = Classifier.classifyEmail(mail, run.suppliers);
        run.results[mail.id] = result;
        run.processedCount++;
        if (result.decision === 'confirmed' && result.documentAttached) recordDocuments(result.supplierId);
        render();
        setTimeout(step, delay / 3);
      }, delay);
    })();
  }

  function resolve(mail, supplierId) {
    state.resolved[mail.id] = supplierId || 'discarded';
    if (supplierId && mail.attachments.length) recordDocuments(supplierId);
    render();
  }

  // ---------- rendering ----------

  function render() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (node) {
      node.textContent = t(node.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });
    $('howLink').href = DOCS_URL[lang];
    document.querySelectorAll('[data-tier]').forEach(function (node) {
      node.textContent = t('tier')[node.getAttribute('data-tier')];
    });
    $('theme').setAttribute('aria-label', isDark() ? t('themeLight') : t('themeDark'));
    $('theme').title = $('theme').getAttribute('aria-label');
    $('today').textContent = today();
    $('process').disabled = state.processing || allProcessed();

    var summary = Compliance.summarize(state.suppliers, today());
    renderSteps();
    renderKpis(summary);
    renderInbox();
    renderReview();
    renderSuppliers(summary);
  }

  function renderSteps() {
    var processed = allProcessed() && !state.processing;
    var reviewed = processed && pendingReview().length === 0;
    var current = !processed ? 1 : (!reviewed ? 2 : 3);
    document.querySelectorAll('#steps li').forEach(function (li) {
      var n = Number(li.getAttribute('data-step'));
      li.className = n < current ? 'done' : (n === current ? 'current' : '');
    });
  }

  function renderKpis(summary) {
    var box = $('kpis');
    box.textContent = '';
    Compliance.STATUSES.forEach(function (status) {
      var card = el('div', 'kpi');
      card.style.setProperty('--c', KPI_COLORS[status]);
      card.appendChild(el('span', 'l', t('kpi')[status]));
      card.appendChild(el('span', 'n', String(summary.counts[status])));
      box.appendChild(card);
    });
  }

  function isSpoof(result) {
    return !!(result && result.reason && result.reason.code === 'unverified-sender');
  }

  function mailRow(mail, result, extraClass) {
    var cls = 'row' + (extraClass ? ' ' + extraClass : '');
    if (result) cls += isSpoof(result) ? ' alert' : ' d-' + result.decision;
    var item = el('li', cls);
    var who = el('div', 'who');
    who.appendChild(el('span', 'from', mail.from));
    who.appendChild(el('span', 'subject', mail.subject));
    if (mail.attachments.length) {
      var files = el('span', 'files');
      mail.attachments.forEach(function (name) { files.appendChild(el('span', 'file', name)); });
      who.appendChild(files);
    }
    item.appendChild(who);
    return item;
  }

  function outcome(result, withDecision) {
    var box = el('div', 'outcome');
    if (isSpoof(result)) box.appendChild(el('span', 'tag alert', t('spoof')));
    else if (withDecision) box.appendChild(el('span', 'tag ' + result.decision, t('decision')[result.decision]));
    return box;
  }

  function whyLine(result) {
    var line = el('div', 'why');
    if (result.tier) {
      line.appendChild(el('span', 'conf', t('conf') + ' ' + t('tier')[result.tier].toLowerCase()));
      line.appendChild(document.createTextNode(' · '));
    }
    if (result.supplierId) {
      line.appendChild(el('b', '', supplierById(result.supplierId).name));
      line.appendChild(document.createTextNode(' · '));
    }
    line.appendChild(document.createTextNode(Messages.explain(result, lang)));
    return line;
  }

  function renderInbox() {
    var n = SampleData.inbox.length;
    var counts = { confirmed: 0, review: 0, unmatched: 0 };
    Object.keys(state.results).forEach(function (id) { counts[state.results[id].decision]++; });
    $('inboxSub').textContent = state.processing
      ? fill(t('inboxBusy'), { i: Math.min(state.processedCount + 1, n), n: n })
      : (state.processedCount ? fill(t('inboxDone'), { c: counts.confirmed, r: counts.review, u: counts.unmatched }) : fill(t('inboxIdle'), { n: n }));
    $('progress').hidden = state.processedCount === 0 && !state.processing;
    $('progressBar').style.width = (100 * state.processedCount / n) + '%';

    var list = $('inbox');
    list.textContent = '';
    SampleData.inbox.forEach(function (mail) {
      var result = state.results[mail.id];
      var item = mailRow(mail, result, state.scanning === mail.id ? 'scanning' : '');
      if (result) {
        item.appendChild(outcome(result, true));
        item.appendChild(whyLine(result));
      }
      list.appendChild(item);
    });
  }

  function renderReview() {
    var list = $('review');
    list.textContent = '';
    var pending = pendingReview();
    $('reviewCount').hidden = !pending.length;
    $('reviewCount').textContent = String(pending.length);
    if (!pending.length) {
      var done = allProcessed() && !state.processing;
      var empty = el('li', 'empty');
      empty.appendChild(el('strong', '', t('reviewEmptyTitle')));
      empty.appendChild(el('span', '', done ? t('reviewDone') : t('reviewEmpty')));
      list.appendChild(empty);
      return;
    }
    pending.forEach(function (mail) {
      var result = state.results[mail.id];
      var item = mailRow(mail, result, '');
      item.appendChild(outcome(result, false));
      item.appendChild(whyLine(result));
      var buttons = el('div', 'buttons');
      result.candidates.forEach(function (c) {
        var b = el('button', 'btn small primary', t('assign') + ' ' + supplierById(c.supplierId).name);
        b.type = 'button';
        b.title = c.evidence.map(function (e) { return Messages.format(e, lang); }).join(', ');
        b.addEventListener('click', function () { resolve(mail, c.supplierId); });
        buttons.appendChild(b);
      });
      var discard = el('button', 'btn small', t('discard'));
      discard.type = 'button';
      discard.addEventListener('click', function () { resolve(mail, null); });
      buttons.appendChild(discard);
      item.appendChild(buttons);
      list.appendChild(item);
    });
  }

  function docsCell(s) {
    var requested = Compliance.toDay(s.docsRequestedAt);
    var received = Compliance.toDay(s.docsReceivedAt);
    var td = el('td', 'nowrap');
    if (received !== null && (requested === null || received >= requested)) {
      td.appendChild(el('span', '', '✓ ' + t('docsReceived') + ' '));
      td.appendChild(el('span', 'date', s.docsReceivedAt));
    } else if (requested !== null) {
      td.appendChild(el('span', '', t('docsRequested') + ' '));
      td.appendChild(el('span', 'date', s.docsRequestedAt));
    } else {
      td.appendChild(el('span', 'muted', t('docsNone')));
    }
    return td;
  }

  function flash(tr, supplierId) {
    var remaining = (state.flashUntil[supplierId] || 0) - Date.now();
    if (remaining <= 0 || reducedMotion() || !tr.animate) return;
    // Rows are rebuilt on every render, so resume the fade where it was.
    var alpha = (0.22 * remaining / FLASH_MS).toFixed(3);
    tr.animate(
      [{ backgroundColor: 'rgba(11, 107, 102, ' + alpha + ')' }, { backgroundColor: 'rgba(11, 107, 102, 0)' }],
      { duration: remaining, easing: 'linear' }
    );
  }

  function renderSuppliers(summary) {
    var body = $('suppliers');
    body.textContent = '';
    summary.rows.forEach(function (row) {
      var s = row.supplier;
      var tr = el('tr');
      var nameCell = el('td');
      nameCell.appendChild(el('span', 'sname', s.name));
      nameCell.appendChild(el('span', 'scontract', s.contractId));
      tr.appendChild(nameCell);
      var statusCell = el('td');
      statusCell.appendChild(el('span', 'status ' + row.status, t('status')[row.status]));
      tr.appendChild(statusCell);
      tr.appendChild(el('td', 'num', row.daysLeft === null ? '—' : String(row.daysLeft)));
      tr.appendChild(docsCell(s));
      tr.appendChild(el('td', 'muted', Messages.format(row.reason, lang)));
      var manual = el('td', row.staleManualStatus ? 'stale nowrap' : 'nowrap');
      if (row.staleManualStatus) {
        manual.appendChild(el('s', '', t('status')[s.manualStatus]));
        manual.appendChild(el('span', 'warnmark', '⚠ ' + t('stale')));
      } else {
        manual.textContent = t('status')[s.manualStatus] || '—';
      }
      tr.appendChild(manual);
      body.appendChild(tr);
      flash(tr, s.id);
    });
  }

  // ---------- wiring ----------

  var saved = storedTheme();
  if (saved === 'dark' || saved === 'light') document.documentElement.setAttribute('data-theme', saved);

  $('process').addEventListener('click', processInbox);
  $('reset').addEventListener('click', function () { $('dayOffset').value = 0; reset(); });
  $('dayOffset').addEventListener('input', render);
  $('theme').addEventListener('click', function () { setTheme(isDark() ? 'light' : 'dark'); });
  document.querySelectorAll('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () { lang = b.getAttribute('data-lang'); render(); });
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', function () { if (state) render(); });
  }

  reset();
})();
