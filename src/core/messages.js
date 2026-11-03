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

  var api = { LANGS: Object.keys(TEMPLATES), format: format, explain: explain, has: has, docName: docName };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Messages = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
