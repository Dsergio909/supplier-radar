// What a document is, from what it says. The fixtures in tests/fixtures/ocr are real
// Tesseract output of fictional documents photographed and scanned (with OCR's mistakes).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Documents = require('../src/core/documents');
const Classifier = require('../src/core/classifier');
const Messages = require('../src/core/messages');

const TODAY = '2026-11-03';
const ocr = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', 'ocr', `${name}.txt`), 'utf8');
const read = (text, opts = {}) => Documents.read(text, { today: TODAY, supplierTaxId: '900123456', ...opts });

test('a scanned Chamber certificate: type, issue date, age and NIT despite OCR noise ("900.123-456:8")', () => {
  const r = read(ocr('camara-escaneo'));
  assert.equal(r.type, 'chamber');
  assert.equal(r.confidence, 'high');
  assert.equal(r.issuedAt, '2026-10-20', 'the expedition date, not the registration (2014) or renewal date');
  assert.equal(r.ageDays, 14);
  assert.equal(r.status, 'ok');
  assert.equal(r.taxIdMatches, true);
  assert.ok(r.evidence.includes('certificado de existencia y representación legal'));
});

test('a bank letter dated in words, from a phone photo that lost a letter ("* los cinco (5) días")', () => {
  for (const name of ['banco-foto', 'banco-escaneo']) {
    const r = read(ocr(name));
    assert.equal(r.type, 'bank-letter', name);
    assert.equal(r.issuedAt, '2026-10-05', `${name}: not the account opening date (2015)`);
    assert.equal(r.status, 'ok');
  }
});

test('a bank letter with no labelled date takes the most recent one and says so', () => {
  const r = read(ocr('banco2-escaneo'));
  assert.equal(r.type, 'bank-letter');
  assert.equal(r.issuedAt, '2026-10-29');
  assert.equal(r.dateFrom, 'latest');
  assert.notEqual(r.confidence, 'high', 'a guessed date lowers the confidence');
  assert.match(Messages.documentStatus(r, 'es'), /la fecha no estaba rotulada/);
});

test('documents older than the company accepts are flagged with how old they are', () => {
  const old = read('CÁMARA DE COMERCIO DE EJEMPLO\nCERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN LEGAL\nFecha de expedición: 2026/08/28');
  assert.equal(old.status, 'too-old');
  assert.equal(old.ageDays, 67);
  assert.equal(old.maxAgeDays, 30);
  assert.equal(Messages.documentStatus(old, 'es'), 'vencido: expedido hace 67 días (máximo 30). Pide uno nuevo');
  // Each company sets its own limit (here 90 days).
  assert.equal(read('CÁMARA DE COMERCIO DE EJEMPLO\nCERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN LEGAL\nFecha de expedición: 2026/08/28',
    { rules: { chamber: { maxAgeDays: 90 } } }).status, 'ok');
  assert.deepEqual(Documents.rulesFromConfig({ 'chamber.maxAgeDays': '45', 'rut.maxAgeDays': 'x', 'nope.maxAgeDays': 3 }), { chamber: { maxAgeDays: 45 } });
});

test('a policy is checked by its end date', () => {
  const r = read(ocr('poliza-vencida-escaneo'));
  assert.equal(r.type, 'policy');
  assert.equal(r.validUntil, '2026-09-30');
  assert.equal(r.status, 'expired');
  assert.equal(Messages.documentStatus(r, 'es'), 'vencido el 2026-09-30. Pide uno nuevo');
});

test('financial statements are dated by their cut-off ("a diciembre 31 de 2025")', () => {
  const r = read(ocr('financieros2-escaneo'));
  assert.equal(r.type, 'financials');
  assert.equal(r.issuedAt, '2025-12-31');
  assert.equal(r.status, 'ok');
});

test('a RUT of another company is noticed (the NIT does not match the supplier)', () => {
  const r = read(ocr('rut-otra-escaneo'));
  assert.equal(r.type, 'rut');
  assert.equal(r.taxIdMatches, false);
  // Numbers without a label (phones, accounts) are not taken for a NIT.
  assert.equal(read('FORMULARIO DEL REGISTRO ÚNICO TRIBUTARIO\nResponsabilidades, calidades y atributos\nTeléfono 601 555 0101').taxIdMatches, null);
  // An individual's NIT is their ID number (10 digits): it still matches.
  assert.equal(read('FORMULARIO DEL REGISTRO ÚNICO TRIBUTARIO\nResponsabilidades, calidades y atributos\nNIT: 1.000.000.040 - 3', { supplierTaxId: '1000000040' }).taxIdMatches, true);
});

test('traps: a social-security form that says "cotización", a cover note, an invoice', () => {
  const pila = read(ocr('pila2-foto'));
  assert.equal(pila.type, 'social-security', '"período de cotización" is not a quote');
  assert.equal(pila.issuedAt, '2026-10-09');

  const note = read(ocr('carta2-foto'));
  assert.equal(note.type, null, 'a note that attaches the RUT is not the RUT');
  assert.equal(note.coverNote, true);
  assert.equal(Messages.documentStatus(note, 'es'), 'es una nota que menciona documentos, no un documento');

  const invoice = read(ocr('factura-escaneo'));
  assert.equal(invoice.type, 'invoice');
  assert.equal(invoice.status, 'not-registration');
});

test('one photo with two documents (RUT + Chamber): each gets its own date and status', () => {
  const r = read(ocr('multi-foto'));
  assert.deepEqual(r.documents.map((d) => [d.type, d.issuedAt, d.status]), [
    ['rut', '2026-10-15', 'ok'],
    ['chamber', '2026-09-20', 'too-old']
  ]);
});

test('the file name is only a weak fallback when nothing can be read', () => {
  const r = Documents.read('', { today: TODAY, fileName: 'RUT_2026.pdf', fileNameType: (n) => Classifier.documentTypes([n])[0] || null });
  assert.equal(r.type, 'rut');
  assert.equal(r.source, 'file-name');
  assert.equal(r.confidence, 'low');
  assert.equal(r.status, 'no-date');
  assert.equal(Messages.documentEvidence(r.source, [], 'es'), 'solo por el nombre del archivo: no se pudo leer el contenido');
  // And a camera file name says nothing at all.
  assert.equal(Classifier.documentTypes(['IMG_20261020_101533.jpg']).length, 0);
});

test('dates as Colombian documents write them', () => {
  const days = (t) => Documents.findDates(t).map((d) => new Date(d.time).toISOString().slice(0, 10));
  assert.deepEqual(days('03/11/2026 · 2026-11-03 · 3 de noviembre de 2026 · noviembre 3 de 2026 · 03-nov-2026'), Array(5).fill('2026-11-03'));
  assert.deepEqual(days('a los veintidós días del mes de agosto de 2026'), ['2026-08-22']);
  assert.deepEqual(days('a los cinco (5) días del mes de octubre del año 2026'), ['2026-10-05']);
  assert.deepEqual(days('1o de noviembre de 2026'), ['2026-11-01']);
  assert.deepEqual(days('31/02/2026 · 2026-13-01'), [], 'impossible dates are ignored');
});

test('it never returns the document\'s numbers, only whether the NIT matches', () => {
  const r = read(ocr('banco-foto'));
  assert.doesNotMatch(JSON.stringify(r), /000-000000|900\.?123|9001234/);
});

test('an ID card is recognised and has no expiry to check', () => {
  const r = read('REPÚBLICA DE COLOMBIA\nIDENTIFICACIÓN PERSONAL\nCÉDULA DE CIUDADANÍA\nAPELLIDOS\nNOMBRES\nFECHA DE NACIMIENTO 01-ENE-1990\nESTATURA 1.70 G.S. RH O+\nREGISTRADOR NACIONAL');
  assert.equal(r.type, 'id-card');
  assert.equal(r.status, 'ok');
  assert.equal(r.issuedAt, null, 'the birth date is not an issue date');
});

// Found with realistic layouts photographed in hard conditions (dim light, WhatsApp, screens, stamps...).
test('a RUT form: the NIT is in boxes on the line below its label, after other box numbers', () => {
  const r = read('Formulario del Registro Único Tributario\n5. Número de Identificación Tributaria (NIT) 6. DV 12. Dirección seccional\n9 0 0 1 2 3 4 5 6 8 Impuestos de Ejemplo\n53. Responsabilidades, calidades y atributos\nFecha generación documento PDF: 21-10-2026 03:15:44PM');
  assert.equal(r.taxIdMatches, true);
  assert.equal(r.issuedAt, '2026-10-21');
});

test('bank certificates whose account table OCR garbles, and online ones dated when looked up', () => {
  const table = read('BANCO EJEMPLAR\nLA SUSCRITA DIRECTORA DE OFICINA\nCERTIFICA\nQue PAPELERÍA EJEMPLO con NIT. 900.123.456-8 tiene en esta entidad el siguiente producto:\nLO CCOO CET EC\nLa presente se expide en Bogotá D.C., el día 28 de Octubre de 2026, con destino a QUIEN INTERESE.');
  assert.deepEqual([table.type, table.issuedAt, table.status], ['bank-letter', '2026-10-28', 'ok']);
  const online = read('Banca en Línea Ejemplo\nCertificado de productos\nFecha y hora de consulta: 30/10/2026 14:22:10\nIdentificación NIT 900.123.456-8\nTipo de cuenta Ahorros');
  assert.deepEqual([online.type, online.issuedAt], ['bank-letter', '2026-10-30']);
});

test('policy validity written as a range, or in a table with "desde | hasta" columns', () => {
  const range = read('ASEGURADORA MODELO\nPóliza No. RC-1. Tomador: X. Asegurado: el mismo.\nVigencia: del 30/09/2025 al 30/09/2026, ambas fechas a las 24:00 horas.\nExpedida en Ciudad Ejemplo el 28/09/2025.');
  assert.deepEqual([range.type, range.validUntil, range.status], ['policy', '2026-09-30', 'expired']);
  const table = read('PÓLIZA DE SEGURO DE CUMPLIMIENTO\nTOMADOR / AFIANZADO X\nAMPAROS VIGENCIA DESDE VIGENCIA HASTA VALOR ASEGURADO\nCumplimiento del contrato 01/02/2026 01/02/2027 $ 10.000.000');
  assert.deepEqual([table.validUntil, table.status], ['2027-02-01', 'ok']);
  // "hasta" as a column header right before the "desde" date: still the later one.
  assert.equal(read('PÓLIZA DE SEGURO\nTomador X\nVIGENCIA DESDE HASTA\n01/02/2026 01/02/2027').validUntil, '2027-02-01');
});

test('a table of dates: the payment deadline is not the payment date, and a guess is never applied alone', () => {
  const r = read('Comprobante de pago de aportes\nNúmero de planilla 9400000000 Tipo de planilla E\nPeríodo pensión Período salud Fechadepago Fecha límite de pago\n2026-09 2026-10 2026-10-09 2026-10-14');
  assert.equal(r.type, 'social-security');
  assert.equal(r.issuedAt, '2026-10-09', '"Fechadepago" (OCR dropped the spaces) is still the label');
  const unlabelled = read('Comprobante de pago de aportes\nNúmero de planilla 9400000000\nPeríodo 2026-10\n2026-10-09 2026-10-14');
  assert.equal(unlabelled.dateFrom, 'latest');
  assert.equal(unlabelled.confidence, 'low');
  assert.deepEqual(Documents.clearDocuments(unlabelled), []);
});

test('a certificate full of dates whose issue date could not be read has no date, not a wrong one', () => {
  const r = read('CERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN LEGAL\nCámara de Comercio\nFecha de matrícula: 12 de marzo de 2014\nPor Documento Privado del 3 de marzo de 2014 inscrito el 12 de marzo de 2014\nActa No. 15 del 20 de febrero de 2020, inscrita el 3 de marzo de 2020');
  assert.equal(r.status, 'no-date');
  assert.equal(r.issuedAt, null);
});

test('a letter that sends documents is not one of them, even when OCR misspells "adjuntamos"', () => {
  const r = read('Ciudad Ejemplo, 29 de octubre de 2026\nSeñores\nDepartamento de Compras\nAsunto: Actualización de documentos de proveedor\nRespetados señores:\nNos permitimos rositr la documentación. Adiuntamos el FIL actualizado, el certificado de existencia y representación legal expedido por la Cámara de Comercio y la certificación bancaria de nuestra cuenta de ahorros.\nQuedamos atentos.\nCordialmente,');
  assert.equal(r.type, null);
  assert.equal(r.coverNote, true);
  // A bank's own letter (to "Señores", signed "Cordialmente") is still a bank letter.
  const bank = read('COOPERATIVA FINANCIERA EJEMPLO\nMedellín, octubre 27 de 2026\nSeñores\nEmpresa Compradora Ejemplo\nAsunto: Certificación de cuenta\nNos permitimos certificar que X, NIT 900.123.456-8, es titular de la cuenta de ahorros número 000000000000.\nCordialmente,');
  assert.deepEqual([bank.type, bank.issuedAt, bank.status], ['bank-letter', '2026-10-27', 'ok']);
});

test('several OCR readings of one photo: read together, and a date they disagree on is checked by a person', () => {
  const a = 'CÁMARA DE COMERCIO\nCERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN LEGAL\nFecha Expedición: 2026/10/28\nNit: 900.123.456-8';
  const misread = a.replace('2026/10/28', '2020/10/29');
  const lost = 'CERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN LEGAL\nCámara de Comercio\nNIT 900 123 456 8';
  const opts = { today: TODAY, supplierTaxId: '900123456' };
  // Two of three readings agree: their date, one notch less sure.
  const two = Documents.readAll([a, misread, a], opts);
  assert.deepEqual([two.issuedAt, two.status, two.confidence, two.datesDisagree], ['2026-10-28', 'ok', 'medium', true]);
  assert.match(Messages.documentStatus(two.documents[0], 'es'), /se leyó distinto/);
  // One against one: nothing is applied on its own.
  const split = Documents.readAll([a, misread], opts);
  assert.equal(split.confidence, 'low');
  assert.deepEqual(Documents.clearDocuments(split), []);
  // A reading that lost the header adds nothing wrong; the date comes from the one that has it.
  const r = Documents.readAll([lost, a], opts);
  assert.deepEqual([r.issuedAt, r.confidence, r.datesDisagree], ['2026-10-28', 'high', undefined]);
});

// Real Tesseract output (three readings each, as the demo reads) of fictional documents laid out
// like the real ones and photographed in hard conditions.
const readings = (name) => ocr(name).split('\n=====\n');
test('real OCR, three readings: a clean Chamber certificate, a policy table, a PILA photo', () => {
  const opts = { today: '2026-11-04', supplierTaxId: '900123456' };
  const camara = Documents.readAll(readings('3lecturas-camara-limpio'), opts);
  // Its readings split on the date (one misread 2026/10/28 as 2020-10-29): the first reading's date, for a person to confirm.
  assert.deepEqual([camara.type, camara.issuedAt, camara.status, camara.taxIdMatches, camara.confidence], ['chamber', '2026-10-28', 'ok', true, 'low']);
  const poliza = Documents.readAll(readings('3lecturas-poliza-tabla'), opts);
  assert.deepEqual([poliza.type, poliza.validUntil, poliza.status], ['policy', '2027-02-01', 'ok']);
  const pila = Documents.readAll(readings('3lecturas-pila-tabla-foto'), opts);
  assert.deepEqual([pila.type, pila.issuedAt, pila.status], ['social-security', '2026-10-09', 'ok'], 'the payment date, not the deadline');
});

test('real OCR, three readings: what must not be applied on its own', () => {
  const opts = { today: '2026-11-04', supplierTaxId: '900123456' };
  // A cover letter photographed in dim light: OCR misspells "adjuntamos" and "remitir".
  const carta = Documents.readAll(readings('3lecturas-carta-poca-luz'), opts);
  assert.equal(carta.type, null);
  assert.equal(carta.coverNote, true);
  // A RUT photo whose NIT boxes OCR cannot read: recognised, but a person checks the NIT.
  const rut = Documents.readAll(readings('3lecturas-rut-formulario-foto'), opts);
  assert.equal(rut.type, 'rut');
  assert.notEqual(rut.taxIdMatches, false);
  if (rut.taxIdMatches !== true) assert.deepEqual(Documents.clearDocuments(rut), []);
});
