/**
 * Supplier Radar — what a document is, from what it says (not its file name).
 *
 * Suppliers send scans and phone photos called "IMG_20261020_101533.jpg" or
 * "doc1.pdf": the file name says nothing. The text does. Given the text of a
 * document (from OCR: Google Drive in Apps Script, Tesseract.js in the demo),
 * this module suggests its type, says how sure it is and why, finds the issue
 * date and checks it against how old the buyer accepts it (a Chamber of
 * Commerce certificate "no older than 30 days"; each company sets its own).
 *
 * It only suggests: a person confirms. It never returns the document's
 * numbers (tax IDs, account numbers): only whether the tax ID matches the
 * supplier's. OCR mistakes ("C4MARA DE COMERC1O") are tolerated.
 *
 * Runs unchanged in Node, the browser and Google Apps Script (V8).
 */
(function (root) {
  'use strict';

  var DAY_MS = 24 * 60 * 60 * 1000;

  // How old each document may be, in days from its issue date. Each company has
  // its own rules: these are common defaults, editable in the Config sheet.
  // labelledOnly: the document always prints its issue date with a label ("Fecha de
  // expedición", "Fecha generación documento"); if OCR cannot read it, there is no guess.
  var DEFAULT_RULES = {
    rut: { maxAgeDays: 30, labelledOnly: true },
    chamber: { maxAgeDays: 30, labelledOnly: true },
    'bank-letter': { maxAgeDays: 30 },
    'social-security': { maxAgeDays: 45 },
    // From the cut-off date (31 December): last year's statements are valid until the next ones are due.
    financials: { maxAgeDays: 485 },
    // A policy is checked by its "valid until" date instead.
    policy: { validity: true },
    'id-card': {}
  };

  // Phrases found in each kind of document, with a weight. Titles weigh most.
  // Written in plain Spanish (and some English); compared after OCR-tolerant folding.
  var TYPES = {
    rut: [
      ['registro único tributario', 5], ['formulario del registro único tributario', 3], ['responsabilidades calidades y atributos', 4],
      ['dirección de impuestos y aduanas nacionales', 2], ['dian', 1], ['número de identificación tributaria', 2],
      ['actividad económica', 1], ['fecha generación documento', 2], ['formulario 001', 2], ['tax id', 1]
    ],
    chamber: [
      ['certificado de existencia y representación legal', 6], ['cámara de comercio', 4], ['certificado de matrícula mercantil', 5],
      ['matrícula mercantil', 2], ['renovación de la matrícula', 2], ['código de verificación', 1], ['objeto social', 1],
      ['representación legal', 1], ['fecha de expedición', 1], ['fecha expedición', 1], ['certificate of incorporation', 4]
    ],
    'bank-letter': [
      ['certificación bancaria', 5], ['cuenta de ahorros', 4], ['cuenta corriente', 4], ['número de cuenta', 2],
      ['fecha de apertura', 2], ['titular de la cuenta', 2], ['se expide a solicitud', 1], ['banco', 1], ['bank reference', 4],
      // As banks abbreviate it: "Cta. de Ahorros No."
      ['cta de ahorros', 4], ['cta ahorros', 4], ['cta corriente', 4], ['cuenta ahorros', 4], ['nos permitimos certificar', 2],
      // When the account sits in a table that OCR garbles, the letter around it still says what it is.
      ['tiene en esta entidad', 3], ['se encuentra activa', 2], ['tipo de cuenta', 3], ['banca en línea', 2], ['quien interese', 1]
    ],
    policy: [
      ['póliza', 4], ['seguro de cumplimiento', 4], ['suma asegurada', 3], ['valor asegurado', 3], ['vigencia desde', 2],
      ['tomador', 2], ['asegurado', 1], ['beneficiario', 1], ['aseguradora', 2], ['amparo', 1], ['prima', 1]
    ],
    'id-card': [
      ['identificación personal', 5], ['registraduría nacional del estado civil', 3], ['registrador nacional', 3],
      ['fecha de nacimiento', 2], ['lugar de nacimiento', 2], ['estatura', 2], ['g s rh', 2], ['apellidos', 1], ['nombres', 1]
    ],
    'social-security': [
      ['planilla integrada de liquidación de aportes', 6], ['pila', 2], ['aportes a seguridad social', 3], ['seguridad social', 2],
      ['planilla', 2], ['período de pago', 2], ['caja de compensación', 1], ['eps', 1], ['arl', 1], ['ibc', 1],
      ['comprobante de pago de aportes', 5], ['número de planilla', 3], ['tipo de planilla', 3], ['período de cotización', 2],
      ['riesgos laborales', 1], ['pensión', 1]
    ],
    financials: [
      ['estado de situación financiera', 6], ['estados financieros', 5], ['balance general', 5], ['estado de resultados', 4],
      ['total activo', 2], ['total pasivo', 2], ['patrimonio', 1], ['revisor fiscal', 1], ['contador público', 1]
    ],
    // Not registration documents: recognised so they are not mistaken for one.
    invoice: [['factura electrónica de venta', 6], ['factura de venta', 4], ['cufe', 3], ['subtotal', 1], ['total a pagar', 1]],
    // "Cotización" alone is not enough: social-security forms say "período de cotización".
    quote: [['cotización no', 4], ['cotización número', 4], ['solicitud de cotización', 2], ['validez de la oferta', 4], ['oferta comercial', 3],
      ['precio unitario', 1], ['valor total', 1], ['forma de pago', 1]]
  };
  var NOT_REGISTRATION = ['invoice', 'quote'];

  // Words that sit right before the date that counts, per type.
  var DATE_ANCHORS = {
    issue: ['fecha de expedicion', 'fecha expedicion', 'fecha y hora de expedicion', 'expedido el', 'expedida el', 'se expide',
      'fecha generacion documento', 'fecha de generacion', 'fecha y hora de generacion', 'generado el', 'fecha de impresion', 'fecha de pago',
      // Certificates downloaded from online banking are dated when they were looked up.
      'fecha de consulta', 'fecha y hora de consulta', 'expedida en', 'expedido en'],
    until: ['vigencia hasta', 'hasta el', 'hasta', 'fecha de vencimiento', 'vence'],
    cutoff: ['a diciembre', 'al 31 de diciembre', 'a 31 de diciembre', 'corte a', 'fecha de corte', 'periodo terminado'],
    // Dates that are never the issue date: when an account was opened, a company registered...
    other: ['abierta el', 'apertura', 'fecha de matricula', 'matriculada el', 'renovacion', 'fecha de inscripcion', 'inscrita el',
      'nacimiento', 'constitucion', 'constituida', 'vigencia desde', 'desde', 'periodo de pago', 'fecha limite', 'limite de pago',
      'inicio actividad', 'ultima reforma']
  };

  var MONTHS = {
    enero: 1, ene: 1, january: 1, jan: 1, febrero: 2, feb: 2, february: 2, marzo: 3, mar: 3, march: 3, abril: 4, abr: 4, april: 4, apr: 4,
    mayo: 5, may: 5, junio: 6, jun: 6, june: 6, julio: 7, jul: 7, july: 7, agosto: 8, ago: 8, august: 8, aug: 8,
    septiembre: 9, setiembre: 9, sep: 9, sept: 9, set: 9, september: 9, octubre: 10, oct: 10, october: 10,
    noviembre: 11, nov: 11, november: 11, diciembre: 12, dic: 12, december: 12, dec: 12
  };
  var NUMBER_WORDS = {
    uno: 1, primero: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
    trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21,
    veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
    veintinueve: 29, treinta: 30, treinta_y_uno: 31
  };

  /**
   * Lowercase, no accents, single spaces. Date punctuation (/ - . :) is kept only
   * between digits ("03/11/2026"); elsewhere OCR scatters it ("se-expide", "mes.de").
   */
  function plain(text) {
    var s = String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\/\-.:() ]+/g, ' ');
    s = s.replace(/[\/\-.:]/g, function (ch, i) { return /\d/.test(s.charAt(i - 1)) && /\d/.test(s.charAt(i + 1)) ? ch : ' '; });
    return s.replace(/\s+/g, ' ').trim();
  }

  /**
   * OCR-tolerant folding for finding phrases: letters that OCR swaps are made
   * equal (0/o, 1/l/i/|, 5/s, 4/a, 8/b), punctuation becomes a space.
   */
  function loose(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[0]/g, 'o').replace(/[1l|!]/g, 'i').replace(/5/g, 's').replace(/4/g, 'a').replace(/8/g, 'b')
      .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function levenshtein(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      var best = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }

  /**
   * Does `phrase` appear in the folded text? Exactly, or (for phrases of 12+
   * letters) with about one OCR mistake per 8 letters.
   */
  function hasPhrase(folded, words, phrase) {
    var p = loose(phrase);
    if ((' ' + folded + ' ').indexOf(' ' + p + ' ') !== -1) return true;
    if (p.length < 12) return false;
    var n = p.split(' ').length;
    var max = Math.floor(p.length / 8);
    for (var i = 0; i + n <= words.length; i++) {
      var window = words.slice(i, i + n).join(' ');
      if (levenshtein(window, p, max) <= max) return true;
    }
    return false;
  }

  /** Every type's score and the phrases that matched. */
  function scoreTypes(text) {
    var folded = loose(text);
    var words = folded.split(' ');
    var scores = {};
    Object.keys(TYPES).forEach(function (type) {
      var s = { type: type, score: 0, evidence: [] };
      TYPES[type].forEach(function (entry) {
        if (hasPhrase(folded, words, entry[0])) { s.score += entry[1]; s.evidence.push(entry[0]); }
      });
      scores[type] = s;
    });
    return scores;
  }

  function validDate(y, m, d) {
    if (!(y >= 1950 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
    var t = Date.UTC(y, m - 1, d);
    var back = new Date(t);
    return back.getUTCDate() === d ? t : null;
  }

  function dayNumber(token) {
    if (/^\d{1,2}$/.test(token)) return Number(token);
    return NUMBER_WORDS[token] || null;
  }

  /** Every date written in the text: { at (index in plain text), time, text }. */
  function findDates(text) {
    var p = plain(text);
    var found = [];
    var add = function (index, y, m, d, raw) {
      var t = validDate(y, m, d);
      if (t !== null) found.push({ at: index, time: t, text: raw });
    };
    var monthNames = Object.keys(MONTHS).sort(function (a, b) { return b.length - a.length; }).join('|');
    var re, m;
    // 2026-11-03, 2026/11/03
    re = /\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g;
    while ((m = re.exec(p))) add(m.index, +m[1], +m[2], +m[3], m[0]);
    // 03/11/2026, 3-11-2026 (day first, as written in Colombia)
    re = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/g;
    while ((m = re.exec(p))) add(m.index, +m[3], +m[2], +m[1], m[0]);
    // 3 de noviembre de 2026, 3 noviembre 2026, 03-nov-2026
    re = new RegExp('\\b(\\d{1,2})o?(?: de | |[\\-\\/.])(' + monthNames + ')\\.?(?: de | del | |[\\-\\/.])(\\d{4})\\b', 'g');
    while ((m = re.exec(p))) add(m.index, +m[3], MONTHS[m[2]], +m[1], m[0]);
    // noviembre 3 de 2026, november 3, 2026
    re = new RegExp('\\b(' + monthNames + ')\\.? (\\d{1,2}),?(?: de | del | )(\\d{4})\\b', 'g');
    while ((m = re.exec(p))) add(m.index, +m[3], MONTHS[m[1]], +m[2], m[0]);
    // a los cinco (5) dias del mes de octubre de 2026
    re = new RegExp('(?:a )?los ([a-z]+|\\d{1,2})(?: y ([a-z]+))?(?: \\((\\d{1,2})\\))? dias? del mes de (' + monthNames + ')(?: de| del)? (?:ano )?(\\d{4})', 'g');
    while ((m = re.exec(p))) {
      var day = m[3] ? Number(m[3]) : dayNumber(m[2] ? m[1] + '_y_' + m[2] : m[1]);
      if (day) add(m.index, +m[5], MONTHS[m[4]], day, m[0]);
    }
    found.sort(function (a, b) { return a.at - b.at; });
    // The same date matched by two patterns at the same place counts once.
    return found.filter(function (f, i) { return !found.slice(0, i).some(function (g) { return g.time === f.time && Math.abs(g.at - f.at) < 4; }); });
  }

  /** The first date written within `reach` characters after one of the anchors. */
  function anchoredDate(text, dates, anchors, reach) {
    var p = plain(text);
    var best = null;
    anchors.forEach(function (anchor) {
      // OCR sometimes drops the spaces of a label ("Fechadepago").
      var re = new RegExp(anchor.split(' ').join(' ?'), 'g'), m;
      while ((m = re.exec(p))) {
        var idx = m.index, end = idx + m[0].length;
        dates.forEach(function (d) {
          // A date may start inside the label ("a diciembre 31 de 2025").
          var distance = Math.max(0, d.at - end);
          if (d.at >= idx && distance <= (reach || 60) && (!best || distance < best.distance)) best = { date: d, distance: distance };
        });
      }
    });
    return best ? best.date : null;
  }

  /** The later of the first two dates written after "vigencia" or "desde" (a validity range). */
  function rangeEnds(text, dates) {
    var p = plain(text);
    var out = [];
    ['vigencia', 'desde'].forEach(function (label) {
      var from = 0, idx;
      while ((idx = p.indexOf(label, from)) !== -1) {
        var near = dates.filter(function (d) { return d.at > idx && d.at - idx <= 130; });
        if (near.length >= 2) out.push(near[1].time >= near[0].time ? near[1] : near[0]);
        from = idx + label.length;
      }
    });
    return out;
  }

  function iso(time) {
    return time === null || time === undefined ? null : new Date(time).toISOString().slice(0, 10);
  }

  function toTime(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
  }

  /**
   * Tax IDs written next to a label ("NIT", "C.C.", "cédula"), as digits without the
   * check digit. Unlabelled numbers (phones, account numbers) are ignored. OCR puts odd
   * separators between groups ("900:123.456-8", "900.123. 456-8"): they are tolerated.
   */
  function taxIds(text) {
    var p = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var re = /(nit|n\.\s?i\.\s?t|identificacion tributaria|c\.\s?c\.|cedula(?: de ciudadania)?)[^0-9\n]{0,25}((?:\d[ \t.,:\-]{0,2}){6,11}\d)/g;
    var out = [];
    var m;
    while ((m = re.exec(p))) out.push(canonicalId(m[2]));
    // Forms (the RUT) put the number in boxes on the line below its label, sometimes after
    // other box numbers ("(NIT) 6. DV 12. Dirección seccional"): a long number further on.
    if (!out.length) {
      re = /(nit|identificacion tributaria)[\s\S]{0,90}?((?:\d[ \t.,:\-]{0,2}){7,10}\d)(?!\d)/g;
      while ((m = re.exec(p))) out.push(canonicalId(m[2]));
    }
    return out;
  }

  /** Digits of a tax ID; a company NIT written with its check digit (10 digits, 8xx/9xx) loses it. */
  function canonicalId(value) {
    var d = String(value || '').replace(/\D/g, '');
    return /^[89]\d{9}$/.test(d) ? d.slice(0, 9) : d;
  }

  /** Date and status of one document of `type`, from its own text. */
  function evaluate(type, body, rules, today, confidence) {
    var e = { issuedAt: null, validUntil: null, dateFrom: null, ageDays: null, maxAgeDays: null, status: 'ok', confidence: confidence };
    var rule = rules[type] || {};
    var dates = findDates(body).filter(function (d) { return d.time <= today + DAY_MS * 400 * 3; });
    var past = dates.filter(function (d) { return d.time <= today + DAY_MS; });
    if (rule.validity) {
      // "hasta: 01/02/2027", "vigencia: del 30/09/2025 al 30/09/2026", or a table whose header
      // says "desde | hasta" and whose row carries both dates: the end is the later one.
      var ends = [anchoredDate(body, dates, DATE_ANCHORS.until, 40)].concat(rangeEnds(body, dates)).filter(Boolean);
      var until = ends.length ? ends.reduce(function (a, b) { return b.time > a.time ? b : a; }) : null;
      if (until) { e.validUntil = iso(until.time); e.dateFrom = 'labelled'; }
      // Nothing labelled: a policy's latest date is almost always when it ends, but a person checks.
      else if (dates.length) {
        until = dates.reduce(function (a, b) { return b.time > a.time ? b : a; });
        e.validUntil = iso(until.time); e.dateFrom = 'latest';
        if (e.confidence === 'high') e.confidence = 'medium';
      }
      var issued = anchoredDate(body, past, DATE_ANCHORS.issue, 60);
      if (issued) e.issuedAt = iso(issued.time);
      e.status = !e.validUntil ? 'no-date' : (toTime(e.validUntil) < today ? 'expired' : 'ok');
      return e;
    }
    if (type === 'id-card' || !rule.maxAgeDays) return e;
    var labelled = anchoredDate(body, past, type === 'financials' ? DATE_ANCHORS.cutoff.concat(DATE_ANCHORS.issue) : DATE_ANCHORS.issue, 60) ||
      // OCR garbled "Fecha" in "Fecha Expedición: 2026/10/28": the word right before the date is enough.
      anchoredDate(body, past, ['expedicion', 'expedido', 'expedida'], 3);
    var chosen = labelled;
    // No label found: the most recent date in the document is usually when it was issued,
    // leaving out the ones labelled as something else (account opened, company registered...).
    var candidates = [];
    if (!chosen && !rule.labelledOnly) {
      var others = DATE_ANCHORS.other.map(function (a) { return anchoredDate(body, past, [a], 25); }).filter(Boolean);
      candidates = past.filter(function (d) { return others.indexOf(d) === -1; });
      // The same date written twice (or read twice) is one date.
      candidates = candidates.filter(function (d, i) { return !candidates.slice(0, i).some(function (o) { return o.time === d.time; }); });
      // A document that must be recent with only an old date in it (a RUT's registration in
      // 2014, an account opened in 2015): that is history, not when it was issued.
      if (rule.maxAgeDays < 365) candidates = candidates.filter(function (d) { return today - d.time <= 365 * DAY_MS; });
      // A guess only among one or two dates: a certificate full of dates (acts, reforms) whose
      // issue date could not be read has no date, rather than a wrong one.
      if (candidates.length && candidates.length <= 2) chosen = candidates.reduce(function (a, b) { return b.time > a.time ? b : a; });
    }
    e.maxAgeDays = rule.maxAgeDays;
    if (!chosen) { e.status = 'no-date'; return e; }
    e.issuedAt = iso(chosen.time);
    e.dateFrom = labelled ? 'labelled' : 'latest';
    // An unlabelled date is a guess: with two to choose from (a table of dates) a person checks.
    if (!labelled) e.confidence = candidates.length > 1 ? 'low' : (e.confidence === 'high' ? 'medium' : e.confidence);
    e.ageDays = Math.round((today - chosen.time) / DAY_MS);
    e.status = e.ageDays > rule.maxAgeDays ? 'too-old' : 'ok';
    return e;
  }

  /**
   * Where each document starts in a file that carries several: the first line
   * that carries one of its title phrases (weight 4 or more).
   */
  function sections(body, types) {
    var lines = String(body).split(/\r?\n/);
    var starts = types.map(function (type) {
      var titles = TYPES[type].filter(function (e) { return e[1] >= 4; });
      // One line first; two together only when OCR split a title across lines.
      for (var span = 1; span <= 2; span++) {
        for (var i = 0; i < lines.length; i++) {
          var folded = loose(lines.slice(i, i + span).join(' '));
          var words = folded.split(' ');
          if (titles.some(function (t) { return hasPhrase(folded, words, t[0]); })) return { type: type, line: i };
        }
      }
      return { type: type, line: -1 };
    });
    var found = starts.filter(function (x) { return x.line >= 0; }).sort(function (a, b) { return a.line - b.line; });
    var out = {};
    types.forEach(function (type) { out[type] = body; });
    if (found.length < 2) return out;
    found.forEach(function (x, i) {
      var from = i === 0 ? 0 : x.line;
      var to = i + 1 < found.length ? found[i + 1].line : lines.length;
      out[x.type] = lines.slice(from, to).join('\n');
    });
    return out;
  }

  /**
   * A note or letter that sends documents ("adjunto el RUT y la cámara de comercio") names
   * them but is not one of them: a short text that says it attaches something, or a letter
   * (to "Señores", signed "Cordialmente") that names two or more kinds of documents.
   */
  function isCoverNote(body, letters) {
    var p = plain(body);
    // OCR reads "adjunto" as "adiunto".
    var sends = /\b(adjunt|adiunt|anex|envi[oa]mos|envio|remit|le comparto|te comparto|attached|please find)/.test(p);
    if (letters < 700 && sends) return true;
    if (letters > 2500) return false;
    var greeting = /\b(senores|senor|respetados|apreciados|estimados)\b/.test(p);
    if (!greeting) return false;
    var closing = /\b(cordialmente|atentamente|quedamos atentos)\b/.test(p);
    // A bank's own letter certifies something; a letter that sends documents only names them.
    var certifies = /\b(certifica|certificamos|certificar|certifico|hace constar|hacemos constar)\b/.test(p);
    var scores = scoreTypes(body);
    var named = Object.keys(scores).filter(function (k) { return NOT_REGISTRATION.indexOf(k) === -1 && scores[k].score >= 4; });
    if (closing && named.length >= 2) return true;
    return !certifies && named.length >= 1;
  }

  /**
   * Read a document's text and suggest what it is.
   * opts: { today: 'YYYY-MM-DD', rules: { type: { maxAgeDays } }, supplierTaxId, fileName, fileNameType }
   * Returns the main document: { type, confidence: 'high'|'medium'|'low', source: 'content'|'file-name'|null,
   *   evidence: [phrases], issuedAt, validUntil, dateFrom: 'labelled'|'latest'|null, ageDays, maxAgeDays,
   *   status, taxIdMatches: true|false|null, documents: [the same for every document in the file] }.
   * status: 'ok' | 'too-old' | 'expired' | 'no-date' | 'not-registration' | 'unknown'.
   */
  function read(text, opts) {
    var o = opts || {};
    var rules = {};
    Object.keys(DEFAULT_RULES).forEach(function (k) { rules[k] = Object.assign({}, DEFAULT_RULES[k], (o.rules || {})[k] || {}); });
    var today = toTime(o.today) || Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    var out = { type: null, confidence: 'low', source: null, evidence: [], issuedAt: null, validUntil: null, dateFrom: null,
      ageDays: null, maxAgeDays: null, status: 'unknown', taxIdMatches: null, taxIdChecked: !!o.supplierTaxId, documents: [] };

    var body = String(text || '');
    var letters = loose(body).replace(/[^a-z]/g, '').length;
    var usable = letters >= 20;
    // A short note that says it attaches documents ("adjunto el RUT y la cámara de comercio")
    // names them but is not one of them.
    if (usable && isCoverNote(body, letters)) {
      out.status = 'unknown';
      out.coverNote = true;
      return out;
    }
    var types = [];
    var scores = null;
    if (usable) {
      scores = scoreTypes(body);
      var ranked = Object.keys(scores).map(function (k) { return scores[k]; }).sort(function (a, b) { return b.score - a.score; });
      var top = ranked[0], second = ranked[1];
      if (top.score >= 4) {
        out.type = top.type;
        out.source = 'content';
        out.confidence = top.score >= 6 && top.score >= 2 * second.score ? 'high' : (top.score >= 5 && top.score > second.score + 1 ? 'medium' : 'low');
        types = [top.type];
        // One PDF often carries several documents (RUT + Chamber + bank letter): read each one.
        if (NOT_REGISTRATION.indexOf(top.type) === -1) {
          ranked.slice(1).forEach(function (r) { if (r.score >= 6 && NOT_REGISTRATION.indexOf(r.type) === -1) types.push(r.type); });
          if (types.length > 1 && out.confidence === 'low') out.confidence = 'medium';
        }
      }
    }
    // No readable text (OCR failed, or not run): the file name is a weak hint at best.
    if (!out.type && o.fileName && typeof o.fileNameType === 'function') {
      var byName = o.fileNameType(o.fileName);
      if (byName) { out.type = byName; out.source = 'file-name'; out.confidence = 'low'; types = [byName]; }
    }
    if (!out.type) return out;
    if (NOT_REGISTRATION.indexOf(out.type) !== -1) { out.status = 'not-registration'; out.evidence = scores[out.type].evidence.slice(0, 4); return out; }

    var parts = usable ? sections(body, types) : {};
    out.documents = types.map(function (type, i) {
      var d = { type: type, confidence: i === 0 ? out.confidence : 'medium', evidence: scores ? scores[type].evidence.slice(0, 4) : [] };
      if (!usable) return Object.assign(d, { issuedAt: null, validUntil: null, dateFrom: null, ageDays: null, maxAgeDays: (rules[type] || {}).maxAgeDays || null, status: (rules[type] || {}).maxAgeDays || (rules[type] || {}).validity ? 'no-date' : 'ok' });
      return Object.assign(d, evaluate(type, parts[type], rules, today, d.confidence));
    });
    var main = out.documents[0];
    ['confidence', 'evidence', 'issuedAt', 'validUntil', 'dateFrom', 'ageDays', 'maxAgeDays', 'status'].forEach(function (k) { out[k] = main[k]; });
    if (usable && o.supplierTaxId) {
      var wanted = canonicalId(o.supplierTaxId);
      var ids = taxIds(body);
      out.taxIdMatches = ids.length ? ids.indexOf(wanted) !== -1 : null;
    }
    return out;
  }

  /**
   * Several OCR readings of the same file (each catches lines the others miss): read
   * together. If two readings found different labelled dates, OCR misread one of them:
   * the result is kept, but with low confidence, so a person checks it.
   */
  function readAll(texts, opts) {
    var list = (texts || []).filter(function (t) { return String(t || '').trim(); });
    if (list.length <= 1) return read(list[0] || '', opts);
    var out = read(list.join('\n\n'), opts);
    if (!out.type || out.source !== 'content') return out;
    // The labelled date each reading found, and how many readings agree on it.
    var votes = {}, from = {};
    list.forEach(function (t) {
      var r = read(t, opts), main = r.documents[0];
      if (r.type !== out.type || !main || main.dateFrom !== 'labelled') return;
      var key = main.validUntil || main.issuedAt;
      votes[key] = (votes[key] || 0) + 1;
      if (!from[key]) from[key] = main;
    });
    var keys = Object.keys(votes).sort();
    if (keys.length <= 1) return out;
    out.datesDisagree = true;
    var main = out.documents[0];
    main.datesDisagree = true;
    var top = keys.reduce(function (a, b) { return votes[b] > votes[a] ? b : a; });
    var majority = keys.every(function (k) { return k === top || votes[k] < votes[top]; });
    // A tie: the latest date. A document is not issued before what it certifies, and a
    // misread usually loses a digit ("2026" read as "2020"), which makes it older.
    var winner = from[majority ? top : keys[keys.length - 1]];
    ['issuedAt', 'validUntil', 'dateFrom', 'ageDays', 'maxAgeDays', 'status'].forEach(function (k) { main[k] = winner[k]; out[k] = winner[k]; });
    // Most readings agree: one notch less sure. A tie: a person checks it.
    if (!majority) main.confidence = out.confidence = 'low';
    else if (main.confidence === 'high') main.confidence = out.confidence = 'medium';
    return out;
  }

  /**
   * The documents of a reading that can be recorded without a person: read from the
   * content (not the file name), not a low guess, recent enough, and with no other
   * company's NIT in them (a RUT: with the supplier's NIT read). Everything else waits for someone to look.
   */
  function clearDocuments(result) {
    if (!result || result.source !== 'content' || result.taxIdMatches === false) return [];
    return (result.documents || []).filter(function (d) {
      // A RUT is about its tax ID: if the supplier's is on file, it must have been read and match.
      if (d.type === 'rut' && result.taxIdChecked && result.taxIdMatches !== true) return false;
      return d.status === 'ok' && d.confidence !== 'low';
    });
  }

  /** Rules from the Config sheet: "chamber.maxAgeDays" = 30 → { chamber: { maxAgeDays: 30 } }. */
  function rulesFromConfig(config) {
    var rules = {};
    Object.keys(config || {}).forEach(function (key) {
      var m = /^([a-z\-]+)\.maxAgeDays$/.exec(key);
      var n = Number(config[key]);
      if (m && DEFAULT_RULES[m[1]] && n > 0 && n <= 3650) rules[m[1]] = { maxAgeDays: Math.round(n) };
    });
    return rules;
  }

  var api = {
    DEFAULT_RULES: DEFAULT_RULES,
    TYPES: Object.keys(TYPES),
    NOT_REGISTRATION: NOT_REGISTRATION,
    read: read,
    readAll: readAll,
    clearDocuments: clearDocuments,
    findDates: findDates,
    scoreTypes: scoreTypes,
    loose: loose,
    rulesFromConfig: rulesFromConfig
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Documents = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
