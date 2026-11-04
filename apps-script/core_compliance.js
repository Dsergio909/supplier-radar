/**
 * Supplier Radar — compliance status.
 *
 * Every status is derived from dates (contract end, documents requested,
 * documents received). A manually maintained "status" column is deliberately
 * ignored: in practice nobody keeps it up to date, so it carries no signal.
 *
 * Runs unchanged in Node, the browser and Google Apps Script (V8).
 */
(function (root) {
  'use strict';

  var DAY_MS = 24 * 60 * 60 * 1000;
  var DEFAULTS = {
    expiringWithinDays: 30,
    replyGraceDays: 7,
    reminderEveryDays: 7,
    // What the request email asks for. Others (policy, ID card...) are kept when they arrive.
    requiredDocuments: ['rut', 'chamber', 'bank-letter']
  };
  var STATUSES = ['expired', 'at-risk', 'expiring', 'active'];
  // Document type (see Classifier.documentTypes) -> optional supplier column with the date it arrived.
  var DOC_FIELDS = {
    rut: 'rutAt', chamber: 'chamberAt', 'bank-letter': 'bankLetterAt', policy: 'policyAt',
    'id-card': 'idCardAt', 'social-security': 'socialSecurityAt', financials: 'financialsAt'
  };
  var DOC_TYPES = Object.keys(DOC_FIELDS);

  /** Parse 'YYYY-MM-DD' or a Date into a UTC-midnight timestamp (or null). */
  function toDay(value) {
    if (!value) return null;
    if (Object.prototype.toString.call(value) === '[object Date]') {
      return isNaN(value) ? null : Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
    }
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
  }

  function daysBetween(from, to) {
    return Math.round((to - from) / DAY_MS);
  }

  function optionsWith(options) {
    return Object.assign({}, DEFAULTS, options || {});
  }

  /** True when the supplier sheet has per-document columns (otherwise only docsReceivedAt is used). */
  function tracksDocuments(supplier) {
    return DOC_TYPES.some(function (t) { return Object.prototype.hasOwnProperty.call(supplier, DOC_FIELDS[t]); });
  }

  /**
   * Required documents plus any other one on file, each with its date and whether it is good.
   *
   * With options.today and options.maxAgeDays ({ chamber: 30, ... }) the date is the document's
   * issue date (read from the document itself) and it is good while it is recent enough:
   * a Chamber certificate issued 20 days ago is fine even if it came before the request.
   * Without them, the date is when it arrived and it must answer the latest request.
   * A policy is good until its policyUntil date, when that column exists.
   */
  function documentChecklist(supplier, options) {
    var opts = optionsWith(options);
    var requested = toDay(supplier.docsRequestedAt);
    var now = toDay(opts.today);
    return DOC_TYPES.filter(function (t) {
      return opts.requiredDocuments.indexOf(t) >= 0 || toDay(supplier[DOC_FIELDS[t]]) !== null;
    }).map(function (t) {
      var received = toDay(supplier[DOC_FIELDS[t]]);
      var maxAge = opts.maxAgeDays && opts.maxAgeDays[t];
      var item = {
        type: t,
        field: DOC_FIELDS[t],
        required: opts.requiredDocuments.indexOf(t) >= 0,
        receivedAt: received === null ? null : new Date(received).toISOString().slice(0, 10),
        ok: received !== null && (requested === null || received >= requested),
        ageDays: null,
        tooOld: false
      };
      if (received !== null && now !== null && maxAge) {
        item.ageDays = daysBetween(received, now);
        item.tooOld = item.ageDays > maxAge;
        item.ok = !item.tooOld;
      }
      if (t === 'policy' && now !== null && toDay(supplier.policyUntil) !== null && toDay(supplier.policyUntil) < now) {
        item.ok = false;
        item.tooOld = true;
      }
      return item;
    });
  }

  /** Required document types still missing for the latest request. */
  function missingDocuments(supplier, options) {
    if (!tracksDocuments(supplier)) return [];
    return documentChecklist(supplier, options)
      .filter(function (d) { return d.required && !d.ok; })
      .map(function (d) { return d.type; });
  }

  /**
   * Fields to write when documents of `types` arrive on `day`: each type's date,
   * moved forward only (never back), plus docsReceivedAt.
   */
  function documentUpdates(supplier, types, day) {
    var updates = {};
    var when = toDay(day);
    (types || []).forEach(function (t) {
      var field = DOC_FIELDS[t];
      if (!field) return;
      var current = toDay(supplier[field]);
      if (current === null || current < when) updates[field] = day;
    });
    var last = toDay(supplier.docsReceivedAt);
    if ((types || []).length && (last === null || last < when)) updates.docsReceivedAt = day;
    return updates;
  }

  /**
   * Status for one supplier on `today`, most urgent first:
   * expired > at-risk (documents requested, no reply) > expiring > active.
   */
  function supplierStatus(supplier, today, options) {
    var opts = optionsWith(options);
    var now = toDay(today);
    var end = toDay(supplier.contractEnd);
    var requested = toDay(supplier.docsRequestedAt);
    var received = toDay(supplier.docsReceivedAt);
    var daysLeft = end === null ? null : daysBetween(now, end);
    var tracked = tracksDocuments(supplier);
    var missing = missingDocuments(supplier, opts);
    var pendingReply = requested !== null &&
      (tracked ? missing.length > 0 : (received === null || received < requested));
    var waitingDays = pendingReply ? daysBetween(requested, now) : 0;

    if (daysLeft !== null && daysLeft < 0) {
      return { status: 'expired', daysLeft: daysLeft, reason: { code: 'contract-ended', days: -daysLeft } };
    }
    if (pendingReply && waitingDays > opts.replyGraceDays) {
      var partial = tracked && missing.length < opts.requiredDocuments.length;
      return {
        status: 'at-risk', daysLeft: daysLeft,
        reason: partial ? { code: 'missing-docs', count: missing.length, days: waitingDays } : { code: 'no-reply', days: waitingDays }
      };
    }
    if (daysLeft !== null && daysLeft <= opts.expiringWithinDays) {
      return { status: 'expiring', daysLeft: daysLeft, reason: { code: 'days-left', days: daysLeft } };
    }
    return { status: 'active', daysLeft: daysLeft, reason: { code: 'up-to-date' } };
  }

  /**
   * True when a supplier is overdue (asked, still missing documents after the grace
   * period, contract still running) and was not reminded in the last few days.
   */
  function needsReminder(supplier, today, options) {
    var opts = optionsWith(options);
    var result = supplierStatus(supplier, today, opts);
    if (result.status !== 'at-risk') return false;
    var reminded = toDay(supplier.remindedAt);
    return reminded === null || daysBetween(reminded, toDay(today)) >= opts.reminderEveryDays;
  }

  /** KPIs plus per-supplier rows, sorted most urgent first. */
  function summarize(suppliers, today, options) {
    var counts = { expired: 0, 'at-risk': 0, expiring: 0, active: 0 };
    var rows = (suppliers || []).map(function (s) {
      var result = supplierStatus(s, today, options);
      counts[result.status]++;
      return {
        supplier: s,
        status: result.status,
        daysLeft: result.daysLeft,
        reason: result.reason,
        missing: missingDocuments(s, options),
        staleManualStatus: !!s.manualStatus && s.manualStatus !== result.status
      };
    });
    rows.sort(function (a, b) {
      return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) ||
        (a.daysLeft === null ? Infinity : a.daysLeft) - (b.daysLeft === null ? Infinity : b.daysLeft);
    });
    return { total: rows.length, counts: counts, rows: rows };
  }

  var api = {
    STATUSES: STATUSES,
    DOC_TYPES: DOC_TYPES,
    DOC_FIELDS: DOC_FIELDS,
    DEFAULTS: DEFAULTS,
    supplierStatus: supplierStatus,
    summarize: summarize,
    documentChecklist: documentChecklist,
    missingDocuments: missingDocuments,
    documentUpdates: documentUpdates,
    needsReminder: needsReminder,
    tracksDocuments: tracksDocuments,
    toDay: toDay
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Compliance = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
