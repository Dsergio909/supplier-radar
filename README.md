<div align="center">

# Supplier Radar

**Supplier and contract compliance automation on Google Workspace.**<br>
Confidence-tiered email matching · documents read by content, even phone photos, and checked for age · human review with a phone check for bank changes · status computed from dates.

[![CI](https://github.com/Dsergio909/supplier-radar/actions/workflows/ci.yml/badge.svg)](https://github.com/Dsergio909/supplier-radar/actions/workflows/ci.yml)
![Google Apps Script](https://img.shields.io/badge/Google_Apps_Script-4285F4?logo=googleappsscript&logoColor=white)
![Paid tools: 0](https://img.shields.io/badge/paid_tools-0-15803d)
![Dependencies: 0](https://img.shields.io/badge/dependencies-0-15803d)
![License: MIT](https://img.shields.io/badge/license-MIT-lightgrey)

[**▶ Live demo**](https://dsergio909.github.io/supplier-radar/) · [How it works](docs/how-it-works.md) · [Cómo funciona (español)](docs/como-funciona.md)

<img src="docs/screenshot.png" alt="Supplier Radar demo: an inbox of supplier replies, a bank-change request blocked until someone confirms it by phone, and the evidence behind each decision" width="100%">

</div>

## The problem

Keeping supplier documents and contracts up to date meant sending requests one by one, digging replies out of Gmail and trusting a spreadsheet "status" column that, in practice, nobody kept current.

I saw this problem first-hand during my procurement internship. Supplier Radar is an independent project that solves it on Google Workspace, with no budget and no paid tools. Everything here is original, tested and runs on fictional data.

The full walkthrough, from the matching rules to installing it in a Google Sheet, is in **[How it works](docs/how-it-works.md)** ([español](docs/como-funciona.md)).

## What it does

1. **Requests documents.** Emails every supplier that has not been asked yet, from a template.
2. **Reads the replies.** Classifies each new inbox message with confidence tiers (below) and logs every decision with its evidence.
3. **Reads each document, not its file name.** Attachments from confirmed replies are saved to a Drive folder per supplier and read with Google Drive's OCR, so scans and phone photos named `IMG_2026….jpg` work too. It recognises the document by what it says (tax ID, chamber of commerce certificate, bank letter, insurance policy, social security, financial statements), finds its issue date and checks it against your rules (a chamber of commerce certificate no older than 30 days, for example). Only a clear, current document of that supplier counts on its own; anything else goes to a person. A price list is filed but does not count.
4. **Asks a human about the rest.** Ambiguous emails land in a review sheet with the evidence and candidate suppliers. A person types the right supplier id and the script applies it, logging who decided.
5. **Blocks payment fraud.** A request to change bank details, an unverified sender or a domain that imitates a supplier's cannot be applied until someone confirms it by phone, on the number already on file.
6. **Chases what is missing.** Suppliers still missing documents after a week get a reminder, at most once a week.
7. **Shows the real picture.** A dashboard of expired, overdue, expiring and up-to-date suppliers, with the missing documents, computed from dates only.

## How the matching works

| Tier | Evidence | Outcome |
|---|---|---|
| `exact` | Registered sender **and** the contract number in the email | Confirmed automatically |
| `high` | Registered sender | Confirmed automatically |
| `medium` | The supplier's corporate domain (gmail.com, hotmail.com and similar never count) | Confirmed if only one supplier matches |
| `low` | A similar company name, or a contract number sent from an unknown address | **Always** human review |

If two suppliers match at the same top tier, for example two companies of one group sharing a domain, the email goes to review. The system never guesses.

Some emails never confirm on their own, whatever the tier:

- **Unverified sender.** Gmail could not authenticate it (SPF/DMARC): someone may be forging the "From".
- **Bank-detail change.** Even from the supplier's real address, because a hacked mailbox passes SPF/DMARC. Banks and payment teams agree: confirm by calling the number already on file, never one in the email.
- **Look-alike domain.** `papeleriandina.example` instead of `papeleriaandina.example`.

Contract numbers match with spaces or without leading zeros (`CT 2026 014`, `CT-2026-14`) but never a longer number (`CT-2026-0140`). Automatic replies ("out of office") are ignored.

## How documents are read

Suppliers send scans and phone photos, and file names say little (`IMG_20260928_093012.jpg`, `doc1.pdf`) or mislead (`Camara_Comercio_sep2026.pdf` issued in July). In testing only 1 of 14 photos could be recognised by name, so `src/core/documents.js` reads the content:

1. **Text:** in Apps Script, Google Drive's OCR converts the file into a temporary Google Doc, its text is exported and the temporary file deleted at once, inside your own account. In the demo, Tesseract.js and PDF.js do it in the browser, after preparing a photo as a scanner app would (sheet found and flattened, lighting evened out, form lines removed, straightened, print scaled to the size OCR reads best) and reading it three ways; `Documents.readAll` merges the readings and sends a date they disagree on to a person.
2. **Type:** weighted phrases specific to each document (*Formulario del Registro Único Tributario*, *Certificado de existencia y representación legal*…), tolerant to OCR mistakes (`C4MARA DE COMERC1O`). Invoices, quotes and cover notes ("attached are the RUT and…") are told apart.
3. **Date:** the issue date, not the registration, renewal or account-opening date, in any Colombian format (`25/09/2026`, `septiembre 25 de 2026`, "a los veinticinco (25) días del mes de…"). Policies are checked by their end date, financial statements by their cut-off.
4. **Age:** against `CONFIG.MAX_AGE_DAYS` (30 days for tax ID, chamber and bank letter by default; 45 for social security; 485 for financial statements).
5. **Tax ID:** a document carrying another company's NIT (a parent company's certificate) is never applied on its own.
6. **Decision:** only a document recognised by content, with high or medium confidence, current and with no foreign NIT is applied automatically, writing its issue date. Everything else goes to the `Documentos` tab, where a person types the type or `no`.

A PDF bundling several documents is read in parts, each with its own date. The text read is never stored: only the type, date, status and whether the NIT matched.

**Stress-tested** on 201 photos of 37 fictional documents laid out like the real ones (RUT form, Chamber certificate, bank letters with security backgrounds, PILA and policy tables, and decoys: invoices, quotes, purchase orders, cover letters) in 15 hard conditions (dim light, glare, low-quality WhatsApp, photo of a screen, fax, crumpled, stamped, crooked, sideways…), 91 of them never used for tuning:

| | Before | Now |
|---|---|---|
| Read right (type, date, validity, NIT) | 101 / 201 (50%) | **159 / 201 (79%)** |
| Clean documents | 26 / 37 | **37 / 37** |
| Applied on their own with a mistake | 1 | **0** |

Everything not read with certainty goes to a person: of 114 valid documents, 79 were recorded automatically. Dim light and low-quality WhatsApp photos are the hardest.

## Design decisions

- **Precision over recall.** A wrong automatic confirmation silently marks a supplier as compliant. A false "needs review" costs a person ten seconds. So only strong, unique evidence is automated.
- **Dates, not status fields.** Status is derived from contract end, request and reply dates. The manual status column is ignored, and the demo highlights where it has drifted from reality.
- **One logic, three runtimes.** `src/core` is plain JavaScript with no dependencies. It is loaded unchanged by Node (tests), the browser (demo) and Google Apps Script (production).
- **Explainable by design.** Every decision carries structured evidence (`{ code, ...params }`), rendered in Spanish or English for the audit log, the review sheet and the demo.
- **Zero paid tools.** Only Google Workspace built-ins (OCR included, through Drive): no Zapier, no Make, no external AI.

## Security

| Risk | Mitigation |
|---|---|
| Spoofed sender (fake supplier, e.g. bank-account change fraud) | Automatic confirmation requires Gmail's SPF or DMARC `pass`; otherwise the email goes to human review marked "possible spoofing". |
| Bank-detail change from a hacked but real supplier mailbox | Never confirmed automatically. In the review sheet the row is marked "Requiere llamada" and is not applied until someone fills in who confirmed it by phone. |
| Look-alike domains | A sender domain one or two letters away from a supplier's goes to review with its own alert. |
| Not knowing who approved what | Every human decision is written to the log with the user's email, the date and the phone check. |
| Formula injection: an email subject like `=IMPORTXML(...)` running in the sheet | Every email-controlled value is written as plain text. |
| Duplicate or racing executions (hourly trigger + manual run) | A script lock allows one execution at a time, and each message id is processed only once. |
| Leaking real data from this public repo | All names, addresses and contracts are fictional. Corporate domains use the reserved `.example` TLD. No company code or data. |
| Demo page (XSS, third parties) | Content is rendered with `textContent` only; a strict Content-Security-Policy allows scripts, styles and workers from the site itself (plus WebAssembly for the OCR), nothing else. The OCR engine and Spanish model are served from the repo, not a CDN, so a file you read never leaves the browser. It uses each computer's own system font. No cookies, trackers or browser storage. |
| Documents carry ID and account numbers | The OCR text is used in memory and never written to the sheet, the log or the demo's state: only type, date, status and whether the NIT matched. The temporary Drive file is deleted right after reading. |
| CI supply chain | Workflows use read-only permissions and do not persist credentials; the project has zero npm dependencies. |

Known limit: reading a document says what it is and how old it is, not whether it is genuine. Someone who controls a supplier's real mailbox can still send forged documents, which is why the audit log keeps every decision.

## Architecture

```mermaid
flowchart LR
  G[Gmail inbox] -->|scanInbox · hourly| C{Classifier<br/>confidence tiers}
  C -->|exact · high · unique medium| OK[Confirmed]
  C -->|low or tie| R[Review sheet<br/>a person decides]
  C -->|no signal| X[Logged and ignored]
  R -->|applyReviewDecisions| OK
  OK --> D[Drive folder per supplier]
  OK --> O{Document reader<br/>Drive OCR · type · date · age}
  O -->|clear and current| S[(Suppliers sheet)]
  O -->|doubtful, old or another NIT| DD[Documentos sheet<br/>a person confirms]
  S --> K[Compliance<br/>dates only] --> B[Dashboard sheet]
  S -->|requestDocuments · daily| M[Request emails]
```

## Project structure

```
src/core/classifier.js   confidence-tier matching
src/core/compliance.js   date-derived status and KPIs
src/core/documents.js    what a document is from its text: type, issue date, age, tax ID
src/core/messages.js     human-readable explanations (ES / EN)
src/data/sample.js       synthetic suppliers and emails
apps-script/Code.js      Gmail · Sheets · Drive adapter
apps-script/core_*.js    copies of src/core, ready to paste (a test keeps them in sync)
apps-script/*.csv        template for the Proveedores sheet
demo/                    interactive browser demo
demo/ocr.js              in-browser OCR (Tesseract.js) and PDF text (PDF.js)
demo/vendor/             those two libraries and the Spanish model, Apache-2.0, served locally
docs/                    how it works, in Spanish and English
tests/                   unit tests, plus the Apps Script adapter run end-to-end
                         against in-memory fakes of SpreadsheetApp, GmailApp, DriveApp and Drive OCR
tests/fixtures/ocr/      real Tesseract output of fictional scanned and photographed documents
```

## Run it

Requires Node 22+ and nothing else: there are no npm dependencies to install (the demo's OCR libraries are already in `demo/vendor`).

```bash
npm test          # runs the whole suite
```

To try the demo locally, serve the repository root (for example `npx http-server .`) and open `/demo/`. It opens with the sample inbox already processed, as the hourly job would leave it: review the doubtful emails in **Bandeja** (with what was read in each attachment), see each supplier's documents and how old they are in **Proveedores**, and every decision in **Registro**. **Leer un documento** reads a photo, scan or PDF of your own in the browser.

### Install it in Google Sheets

No Node needed: the `apps-script/` folder is ready to paste.

1. Create a Google Sheet with a tab named `Proveedores`. Import [`apps-script/Proveedores-plantilla.csv`](apps-script/Proveedores-plantilla.csv) to get the headers, then replace the example rows with your suppliers. Use the status codes `expired`, `at-risk`, `expiring` or `active` in `manualStatus`, or leave it empty. The columns `taxId` (to check documents belong to the supplier), `rutAt`, `chamberAt`, `bankLetterAt`, `policyAt` (each document's issue date, filled in by the script), `policyUntil` and `remindedAt` are optional but recommended: without them documents are tracked as a whole and no reminders are sent.
2. In the sheet, open **Extensions → Apps Script** and create one script file per `.js` file in `apps-script/` (`Code.js` and the four `core_*.js`), pasting its contents. If you use [clasp](https://github.com/google/clasp), push that folder instead.
3. Optional: add a script property `DRIVE_FOLDER_ID` with the id of the Drive folder where documents should be filed.
4. Reload the sheet and use the new **Supplier Radar** menu. **Instalar ejecución automática** scans the inbox every hour, sends requests every day and reminders every morning.

Upgrading from an earlier version: the `Revisión` tab gained two columns (`Requiere llamada` and `Verificado por llamada`). Rename the old tab before the next run so the script creates the new one. Since documents are read by content, the script also creates a `Documentos` tab and a menu item **6. Aplicar documentos revisados**; add `taxId` and `policyUntil` to `Proveedores`, and adjust `MAX_AGE_DAYS` in `CONFIG` to your company's rules (`READ_DOCUMENTS: false` goes back to file names only). The first run asks for one more permission, to call Drive's OCR.

If you change `src/core`, run `npm run build:gas` to refresh the copies; the test suite fails until you do.

## Roadmap

- **AI-assisted review.** For low-confidence cases, an LLM summarises the email and suggests a supplier as a hint. The decision stays human.
- Warn before a contract ends, not only after.

## About

Built by **Sergio García**, an International Business graduate (diploma pending) based in Bogotá who likes turning repetitive work into automated systems. I don't come from engineering: I learned to code by building, using generative AI as a pair programmer. Supplier Radar was built with Claude Code: I designed the rules and reviewed every decision.

[Portfolio](https://dsergio909.github.io/) · [LinkedIn](https://linkedin.com/in/sergio-david-garcia-celis-836b8a250) · [dsergio909@gmail.com](mailto:dsergio909@gmail.com)

---

## 🇪🇸 Resumen en español

**Supplier Radar** automatiza el seguimiento de proveedores y contratos sobre Google Workspace (Sheets, Gmail y Drive), sin herramientas de pago.

- **Solicita documentos** a los proveedores por correo, con plantilla.
- **Lee las respuestas** y decide qué proveedor escribió usando **niveles de confianza**: `exact`, `high`, `medium` y `low`.
- **Frena el fraude de cambio de cuenta.** Un cambio de datos bancarios, un remitente que Gmail no pudo verificar o un dominio que imita al de un proveedor nunca se confirman solos: no se aplican hasta que alguien confirma por teléfono, al número que ya está registrado.
- **Confirma solo lo seguro.** Los casos ambiguos, como un nombre parecido o dos proveedores con el mismo dominio, pasan a una **hoja de revisión humana** con la evidencia.
- **Archiva los adjuntos** en Drive, en una carpeta por proveedor, y **lee cada documento por dentro**, aunque sea una foto del celular o un escaneo (OCR de Google Drive): qué es (RUT, cámara de comercio, certificación bancaria, póliza…), su fecha de expedición y si sigue vigente según tus reglas, por ejemplo cámara de comercio no mayor a 30 días. El nombre del archivo no se usa para decidir. Lo vencido, dudoso o con el NIT de otra empresa queda para que una persona lo confirme.
- **Registra quién decidió** cada caso dudoso, con fecha, hora y la verificación por llamada.
- **Envía recordatorios** a quien lleva más de una semana sin mandar los documentos, máximo uno por semana.
- **El tablero se calcula solo con fechas**: vencidos, en riesgo, por vencer y al día. No depende de columnas de estado que nadie actualiza.

Todos los datos son ficticios (dominios `.example`). Es un proyecto independiente, con pruebas automáticas, que nace de un problema que vi en mis prácticas de compras. [Ver la demo en vivo](https://dsergio909.github.io/supplier-radar/) · [Cómo funciona, paso a paso](docs/como-funciona.md).

## License

[MIT](LICENSE)
