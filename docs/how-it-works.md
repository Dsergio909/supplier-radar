# How Supplier Radar works

[Español](como-funciona.md) · **English**

Supplier Radar keeps your suppliers' documents and contracts up to date without anyone combing through email. It runs inside Google Workspace (Sheets, Gmail and Drive) with no paid tools and no external AI: emails never leave your Google account.

## The problem

Asking each supplier for documents, finding their replies in Gmail and noting in a sheet who has complied is slow and error-prone. Most often, the sheet's "status" column says *up to date* for a supplier who hasn't replied in weeks, because nobody updated it.

## What it does, in three steps

1. **Requests documents.** It emails every supplier who hasn't been asked yet (tax ID, chamber of commerce certificate and bank certificate) and records the date.
2. **Reads the replies.** It scans the inbox, decides which supplier sent each email and how sure it is, files attachments in Drive and records the date of **each document** it recognises (tax ID, chamber of commerce certificate, bank letter, insurance policy). A price list is filed but does not count as a document.
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

## Using the demo

The [demo](https://dsergio909.github.io/supplier-radar/) runs the same logic as the real system (the `src/core` folder) on 9 fictional suppliers and 12 fictional emails. It opens with the inbox already processed, as the hourly run would leave it.

1. **Inbox:** *To review* holds the doubtful emails. Open one, read the full email and the evidence, and choose which supplier sent it (or discard it, or mark it as fraud). Try the *bank account change*: it cannot be applied without a phone check.
2. **Suppliers:** the table shows each supplier's documents (T, C and B: tax ID, chamber of commerce, bank letter). Click one to open its record with documents, emails and the reminder button. Drag **Simulated date** to move time forward and watch the statuses change.
3. **Decision log:** every decision, by the system or by you, with date, time and who made it.

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
   | `rutAt`, `chamberAt`, `bankLetterAt`, `policyAt` | Recommended: the date each document arrived. The system fills them in; if a supplier sends everything in one PDF, type them by hand |
   | `remindedAt` | Recommended: date of the last reminder. Without this column no reminders are sent |

2. **Copy the code.** In the sheet, open **Extensions → Apps Script**. Create one script file per `.js` file in [`apps-script/`](../apps-script) (`Code.js` and the three `core_*.js`) and paste its contents. With [clasp](https://github.com/google/clasp) you can push the whole folder.
3. **Optional: Drive folder.** To file attachments automatically, go to **Project settings → Script properties** and add `DRIVE_FOLDER_ID` with the folder's ID. One subfolder per supplier is created.
4. **Use the menu.** Reload the sheet: a **Supplier Radar** menu appears.

| Menu item | What it does |
|---|---|
| 1. Solicitar documentos pendientes | Emails suppliers who haven't been asked for documents yet |
| 2. Procesar bandeja de entrada | Classifies the last 7 days of email, files attachments and updates dates |
| 3. Aplicar decisiones de revisión | Applies what you typed in the `Revisión` sheet (a supplier `id` or the word `descartar`). Rows marked *Requiere llamada* wait for the phone check |
| 4. Actualizar dashboard | Recomputes the dashboard, with each supplier's missing documents |
| 5. Enviar recordatorios | Emails anyone more than 7 days late with their documents (at most once a week) |
| Instalar ejecución automática | Scans the inbox every hour, sends requests at 8 a.m. and reminders at 9 a.m. |

The first run asks for permission to read and send email, edit the sheet and save files to Drive.

### Sheets the system creates

- **Registro:** every classified email with its decision, confidence tier, explanation and a link to the thread, plus every human decision with the person's email, the date and the phone check. Nothing is deleted.
- **Revisión:** the doubtful cases. Type the supplier `id` or `descartar` in the second-to-last column and use menu item 3. If the row says *Requiere llamada: sí*, first write who called and when in *Verificado por llamada*.

Upgrading from an earlier version: rename the old `Revisión` tab before the next run; the new one has two more columns.
- **Dashboard:** the KPIs and each supplier's status.

Classified emails get the **Supplier Radar** label in Gmail. Email text is never written to the sheet as a formula, so a malicious email can't run anything.

### Settings

The `CONFIG` block in `Code.js` sets the tab names, the Gmail search (by default the last 7 days, excluding promotions and social), the request subject and text, and the language of the explanations.

## Limitations

- It only sees the mailbox of the account running it: replies sent to another address aren't detected.
- It recognises documents by **file name**, not content: a single `documentos.pdf` with everything is filed, but someone must note what it contains. It doesn't check whether a document is current either.
- Gmail searches fetch up to 100 threads per run.

## The 2-minute explanation

> During my procurement internship, keeping supplier documents current meant requesting them one by one, hunting for replies in Gmail and trusting a status column nobody updated. Supplier Radar automates that inside Google Workspace, with no paid tools. The interesting part is how it decides: it doesn't just say "yes" or "no", it says how sure it is. A registered sender citing the contract is confirmed. A merely similar name is never guessed: it goes to a person. And a bank-account change is never accepted on its own, even from the supplier's real address: it must be confirmed by phone on the registered number, and the log records who did it. I tested it with more than 30 real-world emails designed to fool it, and found and fixed failures that way. Each supplier's status is computed from dates, not from what someone typed.
