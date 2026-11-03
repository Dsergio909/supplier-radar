# How Supplier Radar works

[Español](como-funciona.md) · **English**

Supplier Radar keeps your suppliers' documents and contracts up to date without anyone combing through email. It runs inside Google Workspace (Sheets, Gmail and Drive) with no paid tools and no external AI: emails never leave your Google account.

## The problem

Asking each supplier for documents, finding their replies in Gmail and noting in a sheet who has complied is slow and error-prone. Most often, the sheet's "status" column says *up to date* for a supplier who hasn't replied in weeks, because nobody updated it.

## What it does, in three steps

1. **Requests documents.** It emails every supplier who hasn't been asked yet (tax ID, chamber of commerce certificate and bank certificate) and records the date.
2. **Reads the replies.** It scans the inbox, decides which supplier sent each email and how sure it is, files attachments in Drive and records when they arrived.
3. **Computes the status.** From contract and document dates it marks each supplier as *expired*, *at risk*, *expiring* or *up to date*, and builds a dashboard.

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

### Spoofing protection

Gmail checks whether an email really comes from the domain it claims (SPF and DMARC). If that check fails, the email goes to review **even if it looks perfect**, flagged as *possible spoofing*. It's the classic fraud: an email "from the supplier" asking to change the bank account. In the demo it's the last email in the inbox.

## How each supplier's status is computed

Status comes from dates only, checked in this order, most urgent first:

| Status | Rule |
|---|---|
| **Expired** | The contract end date has passed |
| **At risk** | Documents were requested and more than 7 days went by without them |
| **Expiring** | The contract has 30 days or less left |
| **Up to date** | None of the above |

The table also shows the status someone typed by hand in the sheet. If it doesn't match the computed one, it's struck through and flagged *stale*, so you can see at a glance which information in the sheet is no longer true.

## Using the demo

The [demo](https://dsergio909.github.io/supplier-radar/) runs the same logic as the real system (the `src/core` folder) on 9 fictional suppliers and 10 fictional emails.

1. Click **Process inbox**: the system classifies the emails one by one.
2. In **Human review**, check the evidence for each case and assign it to a supplier or discard it.
3. In **Suppliers**, drag **Simulated date** to move time forward and watch the statuses change.

The top bar switches between Spanish and English and between light and dark mode.

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

2. **Copy the code.** In the sheet, open **Extensions → Apps Script**. Create one script file per `.js` file in [`apps-script/`](../apps-script) (`Code.js` and the three `core_*.js`) and paste its contents. With [clasp](https://github.com/google/clasp) you can push the whole folder.
3. **Optional: Drive folder.** To file attachments automatically, go to **Project settings → Script properties** and add `DRIVE_FOLDER_ID` with the folder's ID. One subfolder per supplier is created.
4. **Use the menu.** Reload the sheet: a **Supplier Radar** menu appears.

| Menu item | What it does |
|---|---|
| 1. Solicitar documentos pendientes | Emails suppliers who haven't been asked for documents yet |
| 2. Procesar bandeja de entrada | Classifies the last 7 days of email, files attachments and updates dates |
| 3. Aplicar decisiones de revisión | Applies what you typed in the `Revisión` sheet (a supplier `id` or the word `descartar`) |
| 4. Actualizar dashboard | Recomputes the dashboard |
| Instalar ejecución automática | Scans the inbox every hour and sends requests daily at 8 a.m. |

The first run asks for permission to read and send email, edit the sheet and save files to Drive.

### Sheets the system creates

- **Registro:** every classified email with its decision, confidence tier, explanation and a link to the thread. Nothing is deleted.
- **Revisión:** the doubtful cases. Type the supplier `id` or `descartar` in the second-to-last column and use menu item 3.
- **Dashboard:** the KPIs and each supplier's status.

Classified emails get the **Supplier Radar** label in Gmail. Email text is never written to the sheet as a formula, so a malicious email can't run anything.

### Settings

The `CONFIG` block in `Code.js` sets the tab names, the Gmail search (by default the last 7 days, excluding promotions and social), the request subject and text, and the language of the explanations.

## Limitations

- It only sees the mailbox of the account running it: replies sent to another address aren't detected.
- It knows *that* attachments arrived, but doesn't check *which* documents they are or whether they're current.
- Gmail searches fetch up to 100 threads per run.

## The 2-minute explanation

> During my procurement internship, keeping supplier documents current meant requesting them one by one, hunting for replies in Gmail and trusting a status column nobody updated. Supplier Radar automates that inside Google Workspace, with no paid tools. The interesting part is how it decides: it doesn't just say "yes" or "no", it says how sure it is. A registered sender citing the contract is confirmed. A merely similar name is never guessed: it goes to a person. And if Gmail can't verify the sender, even when everything looks right, it's flagged as possible spoofing, which is how bank-account-change fraud usually arrives. Each supplier's status is computed from dates, not from what someone typed, and the logic is covered by automated tests.
