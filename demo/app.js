/* Supplier Radar demo — UI only. Every decision comes from src/core. */
(function () {
  'use strict';

  var I18N = {
    es: {
      tagline: 'Control de proveedores y contratos',
      howLink: 'Cómo funciona',
      sampleData: 'Demo con datos de ejemplo',
      heroTitle: 'Sabe qué proveedor respondió y quién está al día, sin revisar el correo a mano.',
      intro: 'Supplier Radar lee la bandeja de entrada, reconoce qué proveedor envió cada correo con niveles de confianza, confirma solo lo seguro y te pasa lo dudoso para que decidas. El estado de cada proveedor se calcula con las fechas del contrato y de los documentos.',
      step1: 'Procesa la bandeja', step1Hint: 'El sistema clasifica los 10 correos de ejemplo.',
      step2: 'Resuelve los casos dudosos', step2Hint: 'Revisa la evidencia y asigna o descarta.',
      step3: 'Revisa el estado de tus proveedores', step3Hint: 'Adelanta la fecha y mira cómo cambian.',
      inbox: 'Bandeja de entrada', process: 'Procesar bandeja', reset: 'Reiniciar',
      inboxIdle: '{n} correos sin procesar', inboxBusy: 'Procesando {i} de {n}…', inboxDone: 'Confirmados: {c} · A revisión: {r} · Ignorados: {u}',
      review: 'Revisión humana',
      reviewHint: 'El sistema no adivina: te muestra la evidencia y tú decides.',
      reviewEmptyTitle: 'Nada pendiente',
      reviewEmpty: 'Procesa la bandeja: aquí aparecen los correos que no se pueden asignar con seguridad.',
      reviewDone: 'Todos los casos dudosos están resueltos.',
      suppliers: 'Proveedores',
      suppliersHint: 'Ordenados por urgencia. El estado sale de las fechas, no de lo que alguien escribió en la hoja.',
      simDate: 'Fecha simulada:', clockHint: 'Mueve la barra para adelantar el tiempo.',
      colSupplier: 'Proveedor', colStatus: 'Estado', colDays: 'Días de contrato', colDocs: 'Documentos',
      colReason: 'Motivo', colManual: 'Estado escrito en la hoja',
      howTitle: 'Niveles de confianza', howSub: 'Cómo decide el sistema si un correo es de un proveedor.',
      tierExact: 'Remitente registrado y número de contrato en el correo: se confirma.',
      tierHigh: 'Remitente registrado: se confirma.',
      tierMedium: 'Dominio corporativo del proveedor (nunca Gmail u Hotmail): se confirma si es único; si dos proveedores lo comparten, va a revisión.',
      tierLow: 'Solo un nombre parecido o un número de contrato desde un correo desconocido: siempre va a revisión.',
      footer: 'Datos ficticios · la lógica de src/core está cubierta por pruebas automáticas',
      kpi: { expired: 'Vencidos', 'at-risk': 'En riesgo', expiring: 'Por vencer (30 días)', active: 'Al día' },
      status: { expired: 'Vencido', 'at-risk': 'En riesgo', expiring: 'Por vencer', active: 'Al día' },
      decision: { confirmed: 'Confirmado', review: 'A revisión', unmatched: 'Ignorado' },
      spoof: 'Posible suplantación',
      assign: 'Asignar a', discard: 'Descartar', stale: 'desactualizado',
      docsReceived: 'Recibidos', docsRequested: 'Solicitados', docsNone: 'Sin solicitar',
      themeDark: 'Cambiar a modo oscuro', themeLight: 'Cambiar a modo claro'
    },
    en: {
      tagline: 'Supplier and contract control',
      howLink: 'How it works',
      sampleData: 'Demo with sample data',
      heroTitle: 'Know which supplier replied and who is up to date, without combing through email.',
      intro: 'Supplier Radar reads the inbox, works out which supplier sent each email using confidence tiers, confirms only the safe matches and hands you anything doubtful to decide. Each supplier’s status is computed from contract and document dates.',
      step1: 'Process the inbox', step1Hint: 'The system classifies the 10 sample emails.',
      step2: 'Resolve the doubtful cases', step2Hint: 'Check the evidence, then assign or discard.',
      step3: 'Check your suppliers', step3Hint: 'Move the date forward and watch them change.',
      inbox: 'Inbox', process: 'Process inbox', reset: 'Reset',
      inboxIdle: '{n} unprocessed emails', inboxBusy: 'Processing {i} of {n}…', inboxDone: 'Confirmed: {c} · To review: {r} · Ignored: {u}',
      review: 'Human review',
      reviewHint: 'The system does not guess: it shows the evidence and you decide.',
      reviewEmptyTitle: 'Nothing pending',
      reviewEmpty: 'Process the inbox: emails that cannot be matched safely show up here.',
      reviewDone: 'Every doubtful case is resolved.',
      suppliers: 'Suppliers',
      suppliersHint: 'Sorted by urgency. Status comes from dates, not from what someone typed in the sheet.',
      simDate: 'Simulated date:', clockHint: 'Drag to move time forward.',
      colSupplier: 'Supplier', colStatus: 'Status', colDays: 'Contract days', colDocs: 'Documents',
      colReason: 'Reason', colManual: 'Status typed in the sheet',
      howTitle: 'Confidence tiers', howSub: 'How the system decides whether an email comes from a supplier.',
      tierExact: 'Registered sender and contract number in the email: confirmed.',
      tierHigh: 'Registered sender: confirmed.',
      tierMedium: 'Supplier corporate domain (never Gmail or Hotmail): confirmed if unique; if two suppliers share it, it goes to review.',
      tierLow: 'Only a similar name, or a contract number from an unknown address: always goes to review.',
      footer: 'Fictional data · the logic in src/core is covered by automated tests',
      kpi: { expired: 'Expired', 'at-risk': 'At risk', expiring: 'Expiring (30 days)', active: 'Up to date' },
      status: { expired: 'Expired', 'at-risk': 'At risk', expiring: 'Expiring', active: 'Up to date' },
      decision: { confirmed: 'Confirmed', review: 'To review', unmatched: 'Ignored' },
      spoof: 'Possible spoofing',
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

  function mailHeader(item, mail) {
    item.appendChild(el('span', 'from', mail.from));
    item.appendChild(el('span', 'subject', mail.subject));
    if (mail.attachments.length) {
      var clip = el('span', 'clip');
      mail.attachments.forEach(function (name) { clip.appendChild(el('span', 'file', name)); });
      item.appendChild(clip);
    }
  }

  function isSpoof(result) {
    return !!(result && result.reason && result.reason.code === 'unverified-sender');
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
      var item = el('li', 'mail' + (state.scanning === mail.id ? ' scanning' : '') + (isSpoof(result) ? ' alert' : ''));
      mailHeader(item, mail);
      if (result) {
        var row = el('div', 'result');
        row.appendChild(el('span', 'pill ' + result.decision, t('decision')[result.decision]));
        if (isSpoof(result)) row.appendChild(el('span', 'pill alert', '⚠ ' + t('spoof')));
        if (result.tier) row.appendChild(el('span', 'tag ' + result.tier, result.tier.toUpperCase()));
        var who = result.supplierId ? supplierById(result.supplierId).name + ' · ' : '';
        row.appendChild(el('span', 'why', who + Messages.explain(result, lang)));
        item.appendChild(row);
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
      empty.appendChild(el('span', 'icon', done ? '✓' : '⌛'));
      empty.appendChild(el('strong', '', t('reviewEmptyTitle')));
      empty.appendChild(el('span', '', done ? t('reviewDone') : t('reviewEmpty')));
      list.appendChild(empty);
      return;
    }
    pending.forEach(function (mail) {
      var result = state.results[mail.id];
      var item = el('li', 'mail' + (isSpoof(result) ? ' alert' : ''));
      mailHeader(item, mail);
      var why = el('div', 'result');
      if (isSpoof(result)) why.appendChild(el('span', 'pill alert', '⚠ ' + t('spoof')));
      if (result.tier) why.appendChild(el('span', 'tag ' + result.tier, result.tier.toUpperCase()));
      why.appendChild(el('span', 'why', Messages.explain(result, lang)));
      item.appendChild(why);

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
      td.appendChild(el('span', 'muted', s.docsReceivedAt));
    } else if (requested !== null) {
      td.appendChild(el('span', '', t('docsRequested') + ' '));
      td.appendChild(el('span', 'muted', s.docsRequestedAt));
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
      [{ backgroundColor: 'rgba(34, 197, 94, ' + alpha + ')' }, { backgroundColor: 'rgba(34, 197, 94, 0)' }],
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
      nameCell.appendChild(el('span', 'name', s.name));
      nameCell.appendChild(el('span', 'contract', s.contractId));
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
