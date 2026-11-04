/**
 * Supplier Radar — human-readable explanations (ES / EN).
 *
 * The core modules return evidence and reasons as { code, ...params };
 * this module turns them into sentences for sheets, logs and the demo.
 *
 * Runs unchanged in Node, the browser and Google Apps Script (V8).
 */
(function (root) {
  'use strict';

  var TEMPLATES = {
    es: {
      'registered-sender': 'remitente registrado',
      'contract-referenced': 'cita el contrato {contractId}',
      'corporate-domain': 'dominio corporativo @{domain}',
      'contract-unknown-sender': 'cita el contrato {contractId} desde un correo desconocido',
      'name-match': 'el nombre coincide en {percent}%',
      'no-signal': 'sin señal de ningún proveedor',
      'tie': '{count} proveedores empatan con confianza {tier}',
      'weak-evidence': 'solo evidencia débil',
      'unverified-sender': 'remitente NO verificado (posible suplantación)',
      'bank-change': 'pide cambiar datos bancarios: confirmar por teléfono al número registrado antes de aceptar',
      'lookalike-domain': 'dominio parecido al de un proveedor (posible suplantación)',
      'imitated-domain': '@{domain} imita a @{real}',
      'auto-reply': 'respuesta automática',
      'contract-ended': 'contrato vencido hace {days} días',
      'no-reply': 'sin documentos tras {days} días',
      'missing-docs': 'faltan {count} documentos tras {days} días',
      'doc-rut': 'RUT',
      'doc-chamber': 'Cámara de comercio',
      'doc-bank-letter': 'Certificación bancaria',
      'doc-policy': 'Póliza',
      'doc-id-card': 'Cédula del representante legal',
      'doc-social-security': 'Seguridad social',
      'doc-financials': 'Estados financieros',
      'doc-invoice': 'Factura',
      'doc-quote': 'Cotización',
      'docst-ok': 'vigente',
      'docst-ok-age': 'vigente: expedido hace {days} días (máximo {max})',
      'docst-too-old': 'vencido: expedido hace {days} días (máximo {max}). Pide uno nuevo',
      'docst-policy-ok': 'vigente hasta {date}',
      'docst-expired': 'vencido el {date}. Pide uno nuevo',
      'docst-no-date': 'no encontré la fecha de expedición: revísala en el documento',
      'docst-not-registration': 'no es un documento de inscripción',
      'docst-unknown': 'no reconozco el documento: revísalo',
      'docst-cover-note': 'es una nota que menciona documentos, no un documento',
      'docst-guessed': ' (la fecha no estaba rotulada: es la más reciente del documento)',
      'docst-disagree': ' (el texto se leyó distinto en la fecha: confírmala en el documento)',
      'docev-content': 'dice «{phrases}»',
      'docev-file-name': 'solo por el nombre del archivo: no se pudo leer el contenido',
      'days-left': 'quedan {days} días de contrato',
      'up-to-date': 'al día'
    },
    en: {
      'registered-sender': 'registered sender',
      'contract-referenced': 'references contract {contractId}',
      'corporate-domain': 'corporate domain @{domain}',
      'contract-unknown-sender': 'references contract {contractId} from an unknown address',
      'name-match': 'name matches {percent}%',
      'no-signal': 'no supplier signal',
      'tie': '{count} suppliers tie at {tier} confidence',
      'weak-evidence': 'only weak evidence',
      'unverified-sender': 'sender NOT verified (possible spoofing)',
      'bank-change': 'asks to change bank details: confirm by phone on the number on file before accepting',
      'lookalike-domain': 'domain imitates a supplier (possible spoofing)',
      'imitated-domain': '@{domain} imitates @{real}',
      'auto-reply': 'automatic reply',
      'contract-ended': 'contract ended {days} days ago',
      'no-reply': 'no documents after {days} days',
      'missing-docs': '{count} documents missing after {days} days',
      'doc-rut': 'Tax ID (RUT)',
      'doc-chamber': 'Chamber of commerce certificate',
      'doc-bank-letter': 'Bank letter',
      'doc-policy': 'Insurance policy',
      'doc-id-card': 'Legal representative ID',
      'doc-social-security': 'Social security',
      'doc-financials': 'Financial statements',
      'doc-invoice': 'Invoice',
      'doc-quote': 'Quote',
      'docst-ok': 'valid',
      'docst-ok-age': 'valid: issued {days} days ago (maximum {max})',
      'docst-too-old': 'too old: issued {days} days ago (maximum {max}). Ask for a new one',
      'docst-policy-ok': 'valid until {date}',
      'docst-expired': 'expired on {date}. Ask for a new one',
      'docst-no-date': 'issue date not found: check it on the document',
      'docst-not-registration': 'not a registration document',
      'docst-unknown': 'document not recognised: check it',
      'docst-cover-note': 'a note that mentions documents, not a document',
      'docst-guessed': ' (the date was not labelled: it is the most recent one in the document)',
      'docst-disagree': ' (the date read differently each time: check it on the document)',
      'docev-content': 'it says “{phrases}”',
      'docev-file-name': 'by file name only: the content could not be read',
      'days-left': '{days} days left on contract',
      'up-to-date': 'up to date'
    }
  };

  // Tier names inside sentences ("empatan con confianza media").
  var TIER_NAMES = {
    es: { exact: 'exacta', high: 'alta', medium: 'media', low: 'baja' },
    en: { exact: 'exact', high: 'high', medium: 'medium', low: 'low' }
  };

  function has(lang, code) {
    return !!(TEMPLATES[lang] && TEMPLATES[lang][code]);
  }

  /** One { code, ...params } item as a sentence fragment. */
  function format(item, lang) {
    var template = (TEMPLATES[lang] || TEMPLATES.en)[item.code] || item.code;
    var tiers = TIER_NAMES[lang] || TIER_NAMES.en;
    return template.replace(/\{(\w+)\}/g, function (_, key) {
      if (item[key] === undefined) return '';
      if (key === 'tier' && tiers[item[key]]) return tiers[item[key]];
      return String(item[key]);
    });
  }

  /** Full explanation of a classifier result: reason, then evidence. */
  function explain(result, lang) {
    var parts = [];
    if (result.reason) parts.push(format(result.reason, lang));
    if (result.evidence && result.evidence.length) {
      parts.push(result.evidence.map(function (e) { return format(e, lang); }).join(', '));
    }
    return parts.join(': ');
  }

  /** Display name of a document type ('bank-letter' -> 'Certificación bancaria'). */
  function docName(type, lang) {
    return format({ code: 'doc-' + type }, lang);
  }

  /** What a person should know about a document read (Documents.read result or one of its documents). */
  function documentStatus(doc, lang) {
    var guessed = doc.dateFrom === 'latest' ? format({ code: 'docst-guessed' }, lang) : '';
    if (doc.datesDisagree && (doc.status === 'ok' || doc.status === 'too-old' || doc.status === 'expired')) guessed += format({ code: 'docst-disagree' }, lang);
    switch (doc.status) {
      case 'ok':
        if (doc.validUntil) return format({ code: 'docst-policy-ok', date: doc.validUntil }, lang) + guessed;
        if (doc.ageDays !== null && doc.ageDays !== undefined) return format({ code: 'docst-ok-age', days: doc.ageDays, max: doc.maxAgeDays }, lang) + guessed;
        return format({ code: 'docst-ok' }, lang);
      case 'too-old': return format({ code: 'docst-too-old', days: doc.ageDays, max: doc.maxAgeDays }, lang) + guessed;
      case 'expired': return format({ code: 'docst-expired', date: doc.validUntil }, lang) + guessed;
      case 'no-date': return format({ code: 'docst-no-date' }, lang);
      case 'not-registration': return format({ code: 'docst-not-registration' }, lang);
      default: return format({ code: doc.coverNote ? 'docst-cover-note' : 'docst-unknown' }, lang);
    }
  }

  function confidenceName(level, lang) {
    return (TIER_NAMES[lang] || TIER_NAMES.en)[level] || '';
  }

  /** Why the reader thinks so: the phrases it found, or only the file name. */
  function documentEvidence(source, phrases, lang) {
    if (source === 'file-name') return format({ code: 'docev-file-name' }, lang);
    if (!phrases || !phrases.length) return '';
    return format({ code: 'docev-content', phrases: phrases.slice(0, 2).join(lang === 'en' ? '”, “' : '», «') }, lang);
  }

  // What a person may type to confirm a document ("RUT", "cámara", "certificación bancaria"...).
  var TYPE_WORDS = [
    ['rut', /^(rut|registro unico tributario|tax id)/], ['chamber', /^(camara|ccio|certificado de existencia|chamber)/],
    ['bank-letter', /(bancari|bank)/], ['policy', /^(poliza|policy)/], ['id-card', /^(cedula|documento de identidad|id)/],
    ['social-security', /^(seguridad social|pila|planilla|social security)/], ['financials', /(financier|balance|financial)/]
  ];

  /** Document type from what a person typed, or null. */
  function docTypeFromName(text) {
    var t = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    for (var i = 0; i < TYPE_WORDS.length; i++) if (TYPE_WORDS[i][1].test(t)) return TYPE_WORDS[i][0];
    return null;
  }

  var api = { LANGS: Object.keys(TEMPLATES), format: format, explain: explain, has: has, docName: docName,
    documentStatus: documentStatus, confidenceName: confidenceName, documentEvidence: documentEvidence, docTypeFromName: docTypeFromName };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Messages = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
