/**
 * Supplier Radar — reply classifier.
 *
 * Decides which supplier (if any) sent an email, using confidence tiers
 * instead of a single yes/no match. Only strong, unambiguous matches are
 * confirmed automatically; everything else goes to a human review queue.
 *
 * Evidence and reasons are returned as codes ({ code, ...params }) so any
 * front end can explain them in its own language (see messages.js).
 *
 * Runs unchanged in Node, the browser and Google Apps Script (V8).
 */
(function (root) {
  'use strict';

  var TIERS = ['exact', 'high', 'medium', 'low'];
  var RANK = { exact: 4, high: 3, medium: 2, low: 1 };
  var AUTO_CONFIRM = { exact: true, high: true, medium: true };
  var NAME_MATCH_THRESHOLD = 0.6;

  // Free mailbox providers: anyone can open an address there, so the domain proves nothing.
  var PUBLIC_DOMAIN = /^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|rocketmail|icloud|me|mac|aol|protonmail|proton|pm|gmx|zoho|mail|yandex|tutanota|hey)\.(com|net|org|es|co|mx|ar|cl|pe|ec|br|us|uk|de|fr|it|ch|me|io)(\.[a-z]{2})?$/;
  // Asking to pay into a different account is the classic supplier fraud: never auto-confirm it,
  // even from the real address (a hacked mailbox passes SPF/DMARC).
  var BANK_CHANGE = new RegExp([
    '(cambi|nuev|actualic|actualiz|modific)[a-z]*( (de|la|el|los|las|nuestra|nuestro|nuestros|sus|su|datos))* (cuenta|banco|datos bancarios|informacion bancaria|certificacion bancaria)',
    'cuenta (bancaria )?nueva',
    '(new|updated|change[a-z]*|update[a-z]*)( (of|our|the|to|in))* (bank|account|banking|payment details|remittance)',
    'iban|swift'
  ].join('|'));
  var AUTO_REPLY = /^(re )?(respuesta automatica|automatic reply|auto ?reply|autoreply|fuera de (la )?oficina|out of (the )?office|vacaciones)/;
  // Attachment names that look like the documents procurement asks for.
  var DOCUMENT_TYPES = [
    ['rut', /(^|[^a-z])rut([^a-z]|$)|registro unico tributario|tax id/],
    ['chamber', /camara|(^|[^a-z])ccio([^a-z]|$)|existencia y representacion|certificado de existencia|chamber of commerce|certificate of incorporation/],
    ['bank-letter', /bancari|certificacion banc|cert banc|bank (letter|certificate|reference)/],
    ['policy', /poliza|policy/],
    ['id-card', /cedula|documento de identidad/],
    ['social-security', /seguridad social|parafiscal|planilla|(^|[^a-z])pila([^a-z]|$)/],
    ['financials', /estados financieros|balance general|financial statements/]
  ];
  var STOP_WORDS = ['sas', 'ltda', 'inc', 'the', 'los', 'las', 'del', 'and', 'company', 'grupo'];

  /** Lowercase, strip accents and punctuation (keeps @ . - for addresses and IDs). */
  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9@.\-\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** 'Name <Addr@Example.com>' -> 'addr@example.com'. */
  function senderEmail(from) {
    var match = /<([^>]+)>\s*$/.exec(String(from || '').trim()) || /<([^>]+)>/.exec(from || '');
    return String(match ? match[1] : from || '').replace(/^mailto:/i, '').trim().toLowerCase();
  }

  /** compras+docs@x.com -> compras@x.com (plus addressing reaches the same mailbox). */
  function mailbox(email) {
    return email.replace(/\+[^@]*@/, '@');
  }

  function domainOf(email) {
    var at = email.lastIndexOf('@');
    return at < 0 ? '' : email.slice(at + 1);
  }

  function isPublicDomain(domain) {
    return PUBLIC_DOMAIN.test(domain);
  }

  /** Same domain or one of its subdomains (mail.acme.com belongs to acme.com). */
  function sameOrganization(domain, supplierDomain) {
    var d = normalize(supplierDomain);
    return !!d && !!domain && (domain === d || domain.slice(-(d.length + 1)) === '.' + d);
  }

  /** Levenshtein distance, capped: only small distances matter here. */
  function distance(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  /** A sender domain that imitates a supplier's (papeleriandina vs papeleriaandina). */
  function lookalikeOf(domain, supplier) {
    if (!domain || isPublicDomain(domain)) return null;
    var known = [supplier.domain].concat((supplier.emails || []).map(function (e) { return domainOf(senderEmail(e)); }));
    for (var i = 0; i < known.length; i++) {
      var k = normalize(known[i]);
      if (!k || isPublicDomain(k) || sameOrganization(domain, k)) continue;
      var a = domain.replace(/[-.]/g, ''), b = k.replace(/[-.]/g, '');
      if (a === b || (k.length >= 6 && distance(domain, k) <= 2)) return k;
    }
    return null;
  }

  /** CT-2026-014, CT 2026 014 and ct-2026-14 are the same contract; CT-2026-0140 is not. */
  function contractKey(id) {
    var parts = normalize(id).match(/[a-z]+|\d+/g);
    return parts ? parts.map(function (p) { return /^\d+$/.test(p) ? String(Number(p)) : p; }).join('-') : '';
  }

  function mentionsContract(text, contractId) {
    if (!contractId) return false;
    if (containsTerm(text, contractId)) return true;
    var key = contractKey(contractId);
    var re = /(^|[^a-z0-9])([a-z]{1,6})[\s._-]*(\d{2,4})[\s._-]+(\d{1,6})(?![a-z0-9])/g, m;
    while ((m = re.exec(text))) {
      if (contractKey(m[2] + '-' + m[3] + '-' + m[4]) === key) return true;
    }
    return false;
  }

  /** Requested document types recognised in the attachment names. */
  function documentTypes(attachments) {
    var found = [];
    (attachments || []).forEach(function (name) {
      var n = normalize(String(name).replace(/[_.]/g, ' '));
      DOCUMENT_TYPES.forEach(function (d) {
        if (d[1].test(n) && found.indexOf(d[0]) < 0) found.push(d[0]);
      });
    });
    return found;
  }

  function isBankChange(email) {
    return BANK_CHANGE.test(normalize((email.subject || '') + ' ' + (email.body || '')));
  }

  /** True if `term` appears in `text` as a whole token (CT-2026-04 must not match CT-2026-044). */
  function containsTerm(text, term) {
    var needle = normalize(term);
    if (!needle) return false;
    var escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^a-z0-9-])' + escaped + '(?![a-z0-9-])').test(text);
  }

  function tokens(text) {
    return normalize(text)
      .replace(/[.\-@]/g, ' ')
      .split(' ')
      .filter(function (t) { return t.length > 2 && STOP_WORDS.indexOf(t) < 0; });
  }

  /** Share of the supplier's name tokens found in the text (0..1). */
  function nameScore(name, text) {
    var nameTokens = tokens(name);
    if (!nameTokens.length) return 0;
    var textTokens = tokens(text);
    var hits = nameTokens.filter(function (t) { return textTokens.indexOf(t) >= 0; });
    return hits.length / nameTokens.length;
  }

  /** Strongest tier at which `supplier` matches `email`, or null. */
  function scoreSupplier(email, supplier) {
    var from = senderEmail(email.from);
    var text = normalize((email.subject || '') + ' ' + (email.body || ''));
    var registered = (supplier.emails || []).map(function (e) { return mailbox(senderEmail(e)); }).indexOf(mailbox(from)) >= 0;
    var cites = mentionsContract(text, supplier.contractId);
    var domain = domainOf(from);
    var contract = { code: 'contract-referenced', contractId: supplier.contractId };
    var corporate = domain && !isPublicDomain(domain) && sameOrganization(domain, supplier.domain);

    if (registered && cites) {
      return { tier: 'exact', evidence: [{ code: 'registered-sender' }, contract] };
    }
    if (registered) {
      return { tier: 'high', evidence: [{ code: 'registered-sender' }] };
    }
    if (corporate && cites) {
      // A colleague at the supplier who cites its own contract: settles shared-domain groups.
      return { tier: 'high', evidence: [{ code: 'corporate-domain', domain: domain }, contract] };
    }
    if (corporate) {
      return { tier: 'medium', evidence: [{ code: 'corporate-domain', domain: domain }] };
    }
    var imitated = lookalikeOf(domain, supplier);
    if (imitated) {
      return { tier: 'low', lookalike: true, evidence: [{ code: 'imitated-domain', domain: domain, real: imitated }] };
    }
    if (cites) {
      return { tier: 'low', evidence: [{ code: 'contract-unknown-sender', contractId: supplier.contractId }] };
    }
    var score = nameScore(supplier.name, email.from + ' ' + text);
    if (score >= NAME_MATCH_THRESHOLD) {
      return { tier: 'low', evidence: [{ code: 'name-match', percent: Math.round(score * 100) }] };
    }
    return null;
  }

  /**
   * Classify one email against the supplier list.
   * Set `email.senderVerified = false` when SPF/DMARC failed: the match is
   * then sent to review instead of being confirmed.
   *
   * @returns {{decision: 'confirmed'|'review'|'unmatched', tier: string|null,
   *   supplierId: string|null, reason: object|null, evidence: Array,
   *   candidates: Array, documentAttached: boolean}}
   */
  function classifyEmail(email, suppliers) {
    var candidates = [];
    var lookalike = false;
    (suppliers || []).forEach(function (supplier) {
      var result = scoreSupplier(email, supplier);
      if (result) {
        if (result.lookalike) lookalike = true;
        candidates.push({ supplierId: supplier.id, tier: result.tier, evidence: result.evidence });
      }
    });
    candidates.sort(function (a, b) { return RANK[b.tier] - RANK[a.tier]; });

    var documents = documentTypes(email.attachments);
    var result = {
      decision: 'unmatched', tier: null, supplierId: null, reason: { code: 'no-signal' }, evidence: [],
      candidates: candidates,
      documentAttached: !!(email.attachments && email.attachments.length),
      documents: documents,
      bankChange: isBankChange(email),
      lookalike: lookalike
    };
    if (AUTO_REPLY.test(normalize(email.subject))) {
      result.reason = { code: 'auto-reply' };
      return result;
    }
    if (!candidates.length) return result;

    var best = candidates[0];
    var tied = candidates.filter(function (c) { return c.tier === best.tier; });
    result.tier = best.tier;

    if (lookalike && best.tier === 'low') {
      result.decision = 'review';
      result.supplierId = best.supplierId;
      result.reason = { code: 'lookalike-domain' };
      result.evidence = best.evidence;
    } else if (tied.length > 1) {
      result.decision = 'review';
      result.reason = { code: 'tie', count: tied.length, tier: best.tier };
    } else if (!AUTO_CONFIRM[best.tier]) {
      result.decision = 'review';
      result.supplierId = best.supplierId;
      result.reason = { code: 'weak-evidence' };
      result.evidence = best.evidence;
    } else if (email.senderVerified === false) {
      // A forged "From" header must never confirm a supplier (e.g. fake bank-account change).
      result.decision = 'review';
      result.supplierId = best.supplierId;
      result.reason = { code: 'unverified-sender' };
      result.evidence = best.evidence;
    } else if (result.bankChange) {
      // Even from the real address: confirm by phone, on the number already on file.
      result.decision = 'review';
      result.supplierId = best.supplierId;
      result.reason = { code: 'bank-change' };
      result.evidence = best.evidence;
    } else {
      result.decision = 'confirmed';
      result.supplierId = best.supplierId;
      result.reason = null;
      result.evidence = best.evidence;
    }
    return result;
  }

  var api = {
    TIERS: TIERS,
    classifyEmail: classifyEmail,
    scoreSupplier: scoreSupplier,
    nameScore: nameScore,
    containsTerm: containsTerm,
    mentionsContract: mentionsContract,
    contractKey: contractKey,
    documentTypes: documentTypes,
    isBankChange: isBankChange,
    normalize: normalize,
    senderEmail: senderEmail
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Classifier = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
