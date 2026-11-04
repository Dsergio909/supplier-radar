# How Supplier Radar works

[Español](como-funciona.md) · **English**

Supplier Radar keeps your suppliers' documents and contracts up to date without anyone combing through email. It runs inside Google Workspace (Sheets, Gmail and Drive) with no paid tools and no external AI: emails never leave your Google account.

## The problem

Asking each supplier for documents, finding their replies in Gmail and noting in a sheet who has complied is slow and error-prone. Most often, the sheet's "status" column says *up to date* for a supplier who hasn't replied in weeks, because nobody updated it.

## What it does, in three steps

1. **Requests documents.** It emails every supplier who hasn't been asked yet (tax ID, chamber of commerce certificate and bank certificate) and records the date.
2. **Reads the replies and the documents.** It scans the inbox, decides which supplier sent each email and how sure it is, and files attachments in Drive. Then it **reads each document's content**, even a photo or a scan: what it is (tax ID, chamber of commerce certificate, bank letter, insurance policy…), when it was issued and whether it is still valid under your rules (for example, a chamber of commerce certificate no older than 30 days). A price list is filed but does not count as a document.
3. **Computes the status and chases what is missing.** From contract and document dates it marks each supplier as *expired*, *documents overdue*, *expiring* or *up to date*, builds a dashboard with what each one is missing and reminds anyone more than a week late (at most once a week).

Anything the system can't decide safely, it doesn't guess: it goes to a **human review** sheet where a person assigns or discards it.

## How it decides who sent an email

Each email is compared with the supplier list and gets a confidence tier:

| Tier | What has to be true | What it does |
|---|---|---|
| **EXACT** | Registered sender **and** the contract number appears in the email | Confirms |
| **HIGH** | Registered sender | Confirms |
| **MEDIUM** | The email comes from the supplier's corporate domain (never Gmail, Hotmail and the like) | Confirms if only one supplier uses that domain; if two share it, it goes to review |
| **LOW** | Only a similar name, or a contract number sent from an unknown address | Always goes to review |
| — | No sign of any supplier (for example, marketing) | Ignored |

**Why:** a wrong confirmation marks a non-compliant supplier as *up to date*, which can end in a payment or contract with no paperwork behind it. Sending one extra case to review costs a few seconds. So the system would rather ask.

### Protection against bank-change fraud

Three cases **never** confirm on their own, however strong the evidence:

- **Unverified sender.** Gmail checks whether an email really comes from the domain it claims (SPF and DMARC). If that fails, someone may be impersonating the supplier.
- **Bank-detail change.** Even from the supplier's real address: a hacked mailbox passes Gmail's checks. Banks and payment teams agree on the rule: confirm by calling the number already on file, never one in the email.
- **Look-alike domain.** For example `papeleriandina.example` instead of `papeleriaandina.example`.

In the `Revisión` sheet those rows show **Requiere llamada: sí**, and the system does not apply them until someone writes who called and when in *Verificado por llamada*. In the demo, **Apply decision** stays disabled until the phone-check box is ticked.

Other details tested with real-world cases: contract numbers match with spaces or without leading zeros (`CT 2026 014`, `CT-2026-14`) but never a longer number (`CT-2026-0140`); supplier subdomains count as theirs; and "out of office" auto-replies are ignored.

## How each supplier's status is computed

Status comes from dates only, checked in this order, most urgent first:

| Status | Rule |
|---|---|
| **Expired** | The contract end date has passed |
| **Documents overdue** | Documents were requested and more than 7 days went by without all of them (if some arrived, it says how many are missing) |
| **Expiring** | The contract has 30 days or less left |
| **Up to date** | None of the above |

If the status someone typed by hand in the sheet doesn't match the computed one, the supplier record says so, so you can see at a glance which information in the sheet is no longer true.

## How documents are read

Suppliers send scans and phone photos named `IMG_20260928_093012.jpg`, `doc1.pdf` or `Camara_Comercio_sep2026.pdf` (which may be from July). **The file name is useless**: in testing, only 1 of 14 photos would have been recognised by its name. So Supplier Radar reads the content.

1. **Gets the text.** In the real version, Google Drive reads the photo, scan or PDF with optical character recognition (OCR) inside your own Google account: the file becomes a temporary document, the text is taken and the temporary file is deleted right away. In the demo your browser does it (Tesseract.js and PDF.js) and the file never leaves your computer. Before reading a photo, it prepares it as a scanner app would: it finds the sheet on the desk and flattens it, evens out the lighting (shade, dim rooms, banks' security backgrounds), removes form and table lines (the RUT's boxes), straightens it and brings the print to the size OCR reads best. Then it reads it three ways and puts together what it finds: if the readings disagree on the date, the one most of them found wins, and a tie goes to a person.
2. **Recognises the document by what it says**, using phrases specific to each one: *Formulario del Registro Único Tributario*, *Certificado de existencia y representación legal*, *cuenta de ahorros*, *Planilla integrada de liquidación de aportes*… It tolerates typical OCR mistakes ("C4MARA DE COMERC1O", "se-expide", "Fechadepago") and photos taken sideways or upside down. A letter that only mentions the documents ("attached are the RUT…") is not mistaken for them, even when OCR garbles it.
3. **Finds the date that counts**: the issue or generation date (not the registration, renewal or account-opening date), however it is written: `25/09/2026`, `25 de septiembre de 2026`, `septiembre 25 de 2026` or "a los veinticinco (25) días del mes de septiembre de 2026". If it is not labelled, it takes the most recent date and says so. For a policy it checks the end date; for financial statements, the cut-off date.
4. **Checks validity** against your company's rules (set in `CONFIG.MAX_AGE_DAYS`):

   | Document | Default maximum |
   |---|---|
   | Tax ID (RUT), chamber of commerce, bank letter | 30 days since issue |
   | Social security (PILA) | 45 days |
   | Financial statements | 485 days since the cut-off (last year's are valid until the next ones come out) |
   | Insurance policy | Until its end date |

5. **Checks the tax ID.** If the document shows a NIT that is not the supplier's (for example, the parent company's chamber certificate), it is not recorded on its own.
6. **Decides what to apply on its own.** Only a document recognised by its content, with high or medium confidence, valid and without another company's NIT, is recorded without a person. The supplier sheet gets its **issue date**. Everything else (too old, undated, doubtful, a different NIT, unreadable) goes to the **Documentos** tab for a person to confirm or discard.

A PDF with several documents together (tax ID + chamber + bank letter) is recognised in parts, each with its own date. A note saying "attached are the RUT and the chamber certificate" is not mistaken for those documents, and a social-security form that says "período de cotización" is not mistaken for a quote.

**Privacy:** the text that was read is never saved in the sheet (documents carry ID and account numbers). Only the result is kept: which document it is, its date, whether it is valid and whether the NIT matches.

**How it was tested:** first with 64 simple images of fictional documents (all 64 read correctly today). Then, on purpose, with hard photos: 37 fictional documents laid out like the real ones (the RUT form with boxes, a Chamber certificate full of dates, bank letters with security backgrounds, PILA and policy tables, plus invoices, quotes, purchase orders, cover letters and certificates nobody asked for) photographed in 15 situations: shade, dim light, glare, low-quality WhatsApp, a photo of a screen, photocopy, fax, crooked, crumpled, with a stamp and signature over it, cropped, upside down, sideways, thumbnail and two documents in one photo. 201 images in all; 91 of them were never used to tune anything.

| | Before | Now |
|---|---|---|
| Right (type, date, validity and NIT) | 101 of 201 (50%) | **159 of 201 (79%)** |
| Clean documents | 26 of 37 | **37 of 37** |
| Applied on their own with a mistake | 1 | **0** |

Whatever was not read with certainty went to human review: of 114 valid documents, 79 were recorded on their own and the rest waited for a person. None was recorded with a wrong detail. In the demo, reading a photo takes about 5 seconds (up to 50 if it is sideways and blurry).

## Using the demo

The [demo](https://dsergio909.github.io/supplier-radar/) runs the same logic as the real system (the `src/core` folder) on 9 fictional suppliers and 12 fictional emails. It opens with the inbox already processed, as the hourly run would leave it.

1. **Inbox:** *To review* holds the doubtful emails. Open one, read the full email and the evidence, and choose which supplier sent it (or discard it, or mark it as fraud). Try the *bank account change*: it cannot be applied without a phone check.
   Under each email you can see what was read in each attachment: for example, *Café Origen*'s chamber certificate is named "sep2026" but was issued in July, so it **does not count**; the `IMG_….jpg` photo from *Impresiones Ruiz* is a tax ID.
2. **Suppliers:** the table shows each supplier's valid documents (T, C and B: tax ID, chamber of commerce, bank letter). Click one to open its record with each document's issue date and how many days it has left, its emails and the reminder button. Drag **Simulated date** to move time forward and watch documents expire.
3. **Read a document:** the button in the top bar opens a reader. Upload a photo, a scan or a PDF (or use one of the three fictional samples) and it tells you what document it is, how old it is and whether it is valid. It is read in your browser: the file is not sent anywhere. The first time it downloads the reader (about 9 MB).
4. **Decision log:** every decision, by the system or by you, with date, time and who made it.

The top bar switches between Spanish and English. Dark mode follows your computer's setting.

## Installing it in your Google Sheet

Nothing to install on your computer.

1. **Create the supplier sheet.** In a Google Sheet, add a tab named `Proveedores` and import [`apps-script/Proveedores-plantilla.csv`](../apps-script/Proveedores-plantilla.csv) (File → Import). Replace the sample rows with your suppliers:

   | Column | What goes in it |
   |---|---|
   | `id` | A short unique code, for example `S01` |
   | `name` | Supplier name |
   | `domain` | Their corporate email domain (empty if they use Gmail or Hotmail) |
   | `emails` | Their registered addresses, comma-separated |
   | `contractId` | Contract number, for example `CT-2026-014` |
   | `contractEnd` | Contract end date |
   | `docsRequestedAt` / `docsReceivedAt` | Empty: the system fills them in |
   | `manualStatus` | Optional: `expired`, `at-risk`, `expiring` or `active` |
   | `taxId` | Recommended: the supplier's tax ID (NIT), to check that documents are theirs |
   | `rutAt`, `chamberAt`, `bankLetterAt`, `policyAt` | Recommended: each document's issue date. The system reads it from the document and fills it in |
   | `policyUntil` | Optional: the policy's end date (the system reads it) |
   | `remindedAt` | Recommended: date of the last reminder. Without this column no reminders are sent |

2. **Copy the code.** In the sheet, open **Extensions → Apps Script**. Create one script file per `.js` file in [`apps-script/`](../apps-script) (`Code.js` and the four `core_*.js`) and paste its contents. With [clasp](https://github.com/google/clasp) you can push the whole folder.
3. **Optional: Drive folder.** To file attachments automatically, go to **Project settings → Script properties** and add `DRIVE_FOLDER_ID` with the folder's ID. One subfolder per supplier is created.
4. **Use the menu.** Reload the sheet: a **Supplier Radar** menu appears.

| Menu item | What it does |
|---|---|
| 1. Solicitar documentos pendientes | Emails suppliers who haven't been asked for documents yet |
| 2. Procesar bandeja de entrada | Classifies the last 7 days of email, files attachments and updates dates |
| 3. Aplicar decisiones de revisión | Applies what you typed in the `Revisión` sheet (a supplier `id` or the word `descartar`). Rows marked *Requiere llamada* wait for the phone check |
| 4. Actualizar dashboard | Recomputes the dashboard, with each supplier's missing documents |
| 5. Enviar recordatorios | Emails anyone more than 7 days late with their valid documents (at most once a week) |
| 6. Aplicar documentos revisados | Applies what you typed in the `Documentos` tab (the document type, for example "RUT" or "cámara", or `no`) |
| Instalar ejecución automática | Scans the inbox every hour, sends requests at 8 a.m. and reminders at 9 a.m. |

The first run asks for permission to read and send email, edit the sheet and save files to Drive.

### Sheets the system creates

- **Registro:** every classified email with its decision, confidence tier, explanation and a link to the thread, plus every human decision with the person's email, the date and the phone check. Nothing is deleted.
- **Revisión:** the doubtful cases. Type the supplier `id` or `descartar` in the second-to-last column and use menu item 3. If the row says *Requiere llamada: sí*, first write who called and when in *Verificado por llamada*.

Upgrading from an earlier version: rename the old `Revisión` tab before the next run; the new one has two more columns.
- **Documentos:** every attachment read: which document it is, the confidence, why (the phrases found), the document's date, its age, the status, whether the NIT matches and whether it was applied on its own. In rows that were not applied, type the document type or `no` and use menu item 6.
- **Dashboard:** the KPIs and each supplier's status.

Classified emails get the **Supplier Radar** label in Gmail. Email text is never written to the sheet as a formula, so a malicious email can't run anything.

### Settings

The `CONFIG` block in `Code.js` sets the tab names, the Gmail search (by default the last 7 days, excluding promotions and social), the request subject and text, the language of the explanations, **each document's maximum age** (`MAX_AGE_DAYS`) and whether documents are read (`READ_DOCUMENTS`; with `false` it goes back to file names only).

## Limitations

- It only sees the mailbox of the account running it: replies sent to another address aren't detected.
- Reading works with printed documents and legible photos. Handwriting, very dark or very low-quality photos, or other countries' formats may not be recognised: those stay in the `Documentos` tab for a person and are never taken as valid. In testing, the hardest were dim light (2 in 5 right) and low-quality WhatsApp photos. A RUT whose NIT cannot be read is not recorded on its own either.
- The demo reads with Tesseract.js in the browser. The real version uses Google Drive's OCR, which usually reads better; the rules that decide are the same. It still has to be tried on a real Gmail account. It reads PDF, JPG, PNG, GIF, BMP, TIFF and WebP files up to 10 MB.
- The validity rule is the same for every supplier; if your company asks something different of a particular supplier, confirm it in the `Documentos` tab.
- Gmail searches fetch up to 100 threads per run.

## The 2-minute explanation

> During my procurement internship, keeping supplier documents current meant requesting them one by one, hunting for replies in Gmail and trusting a status column nobody updated. Supplier Radar automates that inside Google Workspace, with no paid tools. The interesting part is how it decides: it doesn't just say "yes" or "no", it says how sure it is. A registered sender citing the contract is confirmed. A merely similar name is never guessed: it goes to a person. And a bank-account change is never accepted on its own, even from the supplier's real address: it must be confirmed by phone on the registered number, and the log records who did it. I tested it with more than 30 real-world emails designed to fool it, and found and fixed failures that way. And it does not trust file names: it reads each document, even a phone photo, to know what it is and how old it is, because a chamber of commerce certificate older than 30 days is no good. Each supplier's status is computed from dates, not from what someone typed.
