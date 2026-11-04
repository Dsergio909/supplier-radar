/**
 * Minimal in-memory fakes of the Apps Script services the adapter uses,
 * so apps-script/Code.js can run end-to-end under `node --test`.
 * They model behaviour the adapter relies on, not the full Google APIs.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const SOURCES = [
  'src/core/classifier.js',
  'src/core/compliance.js',
  'src/core/documents.js',
  'src/core/messages.js',
  'apps-script/Code.js'
];

// Like Sheets: a leading apostrophe forces text and is not part of the value.
function cellValue(v) {
  return typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v;
}

function createSheet(name, rows = []) {
  const data = rows.map((r) => r.map(cellValue));
  const raw = []; // rows exactly as the adapter wrote them, before Sheets' text handling
  const width = () => Math.max(1, ...data.map((r) => r.length));
  const get = (r, c) => {
    const v = (data[r] || [])[c];
    return v === undefined ? '' : v;
  };
  const sheet = {
    name,
    data,
    raw,
    getName: () => name,
    appendRow(row) {
      raw.push(Array.from(row));
      data.push(Array.from(row, cellValue)); // copy into this realm so assertions compare plain arrays
      return sheet;
    },
    getLastRow: () => data.length,
    getDataRange() {
      return {
        getValues: () => (data.length ? data : [[]]).map((_, r) =>
          Array.from({ length: width() }, (__, c) => get(r, c)))
      };
    },
    getRange(row, column, numRows = 1, numColumns = 1) {
      return {
        setValue(value) {
          while (data.length < row) data.push([]);
          data[row - 1][column - 1] = cellValue(value);
        },
        getValues: () => Array.from({ length: numRows }, (_, r) =>
          Array.from({ length: numColumns }, (__, c) => get(row - 1 + r, column - 1 + c)))
      };
    },
    clear() {
      data.length = 0;
    }
  };
  return sheet;
}

const TYPES = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };

// `text` is what Drive's OCR would read in the file (see UrlFetchApp below).
function createAttachment(name, text = '') {
  const type = TYPES[(name.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';
  const bytes = Array.from(Buffer.from('OCR:' + text, 'utf8'));
  return { getName: () => name, copyBlob: () => ({ name, getContentType: () => type, getBytes: () => bytes }) };
}

function createMessage({ id, from, subject, body = '', date, attachments = [], texts = {}, auth = 'mx.google.com; spf=pass' }) {
  return {
    getHeader: (name) => (name === 'Authentication-Results' ? auth : ''),
    getId: () => id,
    getFrom: () => from,
    getSubject: () => subject,
    getPlainBody: () => body,
    getDate: () => date,
    getAttachments: () => attachments.map((n) => createAttachment(n, texts[n] || '')),
    getThread: () => ({ getPermalink: () => `https://mail.google.com/mail/#all/${id}` })
  };
}

function createThread(id, messages) {
  const thread = {
    id,
    labels: [],
    getMessages: () => messages,
    getPermalink: () => `https://mail.google.com/mail/#all/${id}`,
    addLabel(label) {
      thread.labels.push(label.getName());
      return thread;
    }
  };
  return thread;
}

function createFolder(name) {
  const folder = {
    name,
    files: [],
    folders: [],
    getFoldersByName(n) {
      const found = folder.folders.filter((f) => f.name === n);
      return { hasNext: () => found.length > 0, next: () => found.shift() };
    },
    createFolder(n) {
      const child = createFolder(n);
      folder.folders.push(child);
      return child;
    },
    createFile(blob) {
      folder.files.push(blob.name);
      return blob;
    }
  };
  return folder;
}

/**
 * Build a sandbox with fakes and load the adapter into it.
 * @param {{sheets?: Object<string, Array[]>, threads?: Array, me?: string,
 *   properties?: Object, now?: Date}} options
 */
function loadAdapter({ sheets = {}, threads = [], me = 'compras@miempresa.example', properties = {}, now, lockFree = true } = {}) {
  const book = {};
  Object.keys(sheets).forEach((n) => { book[n] = createSheet(n, sheets[n]); });
  const toasts = [];
  const sent = [];
  const labels = {};
  const driveRoot = createFolder('root');
  // Drive OCR: a multipart upload becomes a temporary Doc whose text can be exported, then deleted.
  const docs = {};
  const ocrCalls = [];
  let nextId = 1;
  const UrlFetchApp = {
    fetch(url, opts = {}) {
      const reply = (code, body = '') => ({ getResponseCode: () => code, getContentText: () => body });
      if (/upload\/drive\/v3\/files\?uploadType=multipart/.test(url)) {
        const raw = Buffer.from(opts.payload).toString('utf8');
        const m = /OCR:([\s\S]*?)\r\n--supplier-radar-/.exec(raw);
        const id = 'doc' + nextId++;
        docs[id] = m ? m[1] : '';
        ocrCalls.push({ url, auth: opts.headers && opts.headers.Authorization, ocrLanguage: /ocrLanguage=es/.test(url) });
        return reply(200, JSON.stringify({ id }));
      }
      let m = /drive\/v3\/files\/([^/?]+)\/export/.exec(url);
      if (m) return docs[m[1]] === undefined ? reply(404) : reply(200, docs[m[1]]);
      m = /drive\/v3\/files\/([^/?]+)$/.exec(url);
      if (m && opts.method === 'delete') { delete docs[m[1]]; return reply(204); }
      return reply(404);
    }
  };

  const context = {
    console,
    SpreadsheetApp: {
      getActive: () => ({
        getSheetByName: (n) => book[n] || null,
        insertSheet: (n) => (book[n] = createSheet(n)),
        toast: (msg) => toasts.push(msg)
      })
    },
    GmailApp: {
      search: (query, start, max) => threads.slice(start, start + max),
      getUserLabelByName: (n) => labels[n] || null,
      createLabel: (n) => (labels[n] = { getName: () => n }),
      sendEmail: (to, subject, body) => sent.push({ to, subject, body }),
      getMessageById: (id) => threads.flatMap((t) => t.getMessages()).find((m) => m.getId() === id) || null
    },
    DriveApp: { getFolderById: () => driveRoot },
    LockService: { getScriptLock: () => ({ tryLock: () => lockFree, releaseLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => properties[k] || null }) },
    Session: {
      getEffectiveUser: () => ({ getEmail: () => me }),
      getScriptTimeZone: () => 'America/Bogota'
    },
    Utilities: {
      formatDate: (date) => date.toISOString().slice(0, 16).replace('T', ' '),
      getUuid: () => '00000000-0000-4000-8000-000000000000',
      newBlob: (text) => ({ getBytes: () => Array.from(Buffer.from(String(text), 'utf8')) })
    },
    UrlFetchApp,
    ScriptApp: { getOAuthToken: () => 'token-de-prueba', getProjectTriggers: () => [], deleteTrigger: () => {}, newTrigger: () => ({ timeBased: () => ({ everyHours: () => ({ create: () => {} }), everyDays: () => ({ atHour: () => ({ create: () => {} }) }) }) }) }
  };
  vm.createContext(context);
  SOURCES.forEach((file) => {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  });
  if (now) context.now_ = () => now;

  return { gas: context, book, sent, toasts, driveRoot, docs, ocrCalls };
}

module.exports = { loadAdapter, createMessage, createThread };
