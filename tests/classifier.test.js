const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyEmail, nameScore, senderEmail, containsTerm, normalize, documentTypes } = require('../src/core/classifier');
const { suppliers, inbox } = require('../src/data/sample');

for (const email of inbox) {
  test(`${email.id}: ${email.subject}`, () => {
    const result = classifyEmail(email, suppliers);
    assert.equal(result.decision, email.expect.decision, JSON.stringify(result));
    assert.equal(result.tier, email.expect.tier);
    assert.equal(result.supplierId, email.expect.supplierId);
  });
}

test('extracts the address from a display-name sender', () => {
  assert.equal(senderEmail('Laura Méndez <Laura.Mendez@CafeOrigen.Example>'), 'laura.mendez@cafeorigen.example');
});

test('name matching ignores accents, case and company suffixes', () => {
  assert.equal(nameScore('Logística del Caribe Ltda', 'LOGISTICA CARIBE envía documentos'), 1);
  assert.equal(nameScore('Logística del Caribe Ltda', 'caribe'), 0.5);
});

test('contract numbers match as whole tokens only', () => {
  const text = normalize('Consulta sobre el contrato CT-2026-044.');
  assert.equal(containsTerm(text, 'CT-2026-044'), true);
  assert.equal(containsTerm(text, 'CT-2026-04'), false);
  assert.equal(containsTerm(text, ''), false);
});

test('two suppliers registered on the same mailbox go to review', () => {
  const shared = [
    { id: 'A', name: 'Alfa', emails: ['facturas@holding.example'] },
    { id: 'B', name: 'Beta', emails: ['facturas@holding.example'] }
  ];
  const result = classifyEmail({ from: 'facturas@holding.example', subject: 'Docs', body: '' }, shared);
  assert.equal(result.decision, 'review');
  assert.deepEqual(result.reason, { code: 'tie', count: 2, tier: 'high' });
});

test('a public mail domain never counts as a corporate match', () => {
  const gmailSupplier = { id: 'X', name: 'Acme', domain: 'gmail.com', emails: ['acme@gmail.com'] };
  const result = classifyEmail({ from: 'stranger@gmail.com', subject: 'hola', body: '' }, [gmailSupplier]);
  assert.equal(result.decision, 'unmatched');
});

test('a registered sender beats a shared domain, so it is not a tie', () => {
  const result = classifyEmail(
    { from: 'seguridad@novagrupo.example', subject: 'Documentos', body: '', attachments: ['a.pdf'] },
    suppliers
  );
  assert.equal(result.decision, 'confirmed');
  assert.equal(result.supplierId, 'S06');
  assert.equal(result.documentAttached, true);
});

test('a forged sender never auto-confirms, even with exact evidence', () => {
  const email = { from: 'compras@papeleriaandina.example', subject: 'Cambio de cuenta CT-2026-014', body: '', senderVerified: false };
  const result = classifyEmail(email, suppliers);
  assert.equal(result.decision, 'review');
  assert.equal(result.tier, 'exact');
  assert.deepEqual(result.reason, { code: 'unverified-sender' });
});

// ---------- Real-world cases found by testing (3-nov-2026) ----------

const mail = (from, subject, extra) => Object.assign({ from, subject, body: '', attachments: [] }, extra || {});

test('a bank-account change never auto-confirms, even from the real, verified address', () => {
  for (const subject of ['Cambio de cuenta bancaria CT-2026-014', 'Nuevos datos bancarios para pagos', 'Please update our bank details']) {
    const result = classifyEmail(mail('compras@papeleriaandina.example', subject, { senderVerified: true }), suppliers);
    assert.equal(result.decision, 'review', subject);
    assert.equal(result.reason.code, 'bank-change', subject);
    assert.equal(result.supplierId, 'S01');
  }
});

test('sending a requested bank letter is not a bank-account change', () => {
  const result = classifyEmail(mail('ops@logcaribe.example', 'Envío certificado bancario', { attachments: ['certificado_bancario.pdf'] }), suppliers);
  assert.equal(result.decision, 'confirmed');
  assert.equal(result.bankChange, false);
  assert.deepEqual(result.documents, ['bank-letter']);
});

test('a domain that imitates a supplier goes to review with its own alert', () => {
  const result = classifyEmail(mail('compras@papeleriandina.example', 'Actualización de datos'), suppliers);
  assert.equal(result.decision, 'review');
  assert.equal(result.reason.code, 'lookalike-domain');
  assert.equal(result.lookalike, true);
  assert.deepEqual(result.evidence, [{ code: 'imitated-domain', domain: 'papeleriandina.example', real: 'papeleriaandina.example' }]);
});

test('a fake display name with an attacker address is never trusted', () => {
  const result = classifyEmail(mail('compras@papeleriaandina.example <pagos@otro.example>', 'Documentos CT-2026-014'), suppliers);
  assert.equal(result.decision, 'review');
  assert.equal(result.tier, 'low');
});

test('contract numbers match with spaces or without leading zeros, but not longer numbers', () => {
  assert.equal(classifyEmail(mail('compras@papeleriaandina.example', 'Contrato CT 2026 014'), suppliers).tier, 'exact');
  assert.equal(classifyEmail(mail('compras@papeleriaandina.example', 'Contrato ct-2026-14'), suppliers).tier, 'exact');
  assert.equal(classifyEmail(mail('juan@desconocido.example', 'CT-2026-0140'), suppliers).decision, 'unmatched');
});

test('automatic replies are ignored, even from a registered sender', () => {
  const result = classifyEmail(mail('ops@logcaribe.example', 'Respuesta automática: Fuera de la oficina'), suppliers);
  assert.equal(result.decision, 'unmatched');
  assert.equal(result.reason.code, 'auto-reply');
});

test('a subdomain of the supplier counts as its corporate domain', () => {
  const result = classifyEmail(mail('laura@mail.cafeorigen.example', 'Documentos', { attachments: ['poliza.pdf'] }), suppliers);
  assert.equal(result.decision, 'confirmed');
  assert.equal(result.supplierId, 'S04');
});

test('free mail providers in other countries are public too', () => {
  for (const d of ['outlook.es', 'yahoo.com.mx', 'hotmail.com.co', 'mail.com']) {
    const own = [{ id: 'Z', name: 'Zeta', domain: d, emails: [] }];
    assert.equal(classifyEmail(mail('x@' + d, 'Documentos'), own).decision, 'unmatched', d);
  }
});

test('a colleague who cites one contract settles a shared-domain group', () => {
  const result = classifyEmail(mail('facturacion@novagrupo.example', 'Documentos CT-2026-045', { attachments: ['rut.pdf'] }), suppliers);
  assert.equal(result.decision, 'confirmed');
  assert.equal(result.supplierId, 'S07');
});

test('plus addressing reaches the registered mailbox', () => {
  const result = classifyEmail(mail('compras+docs@papeleriaandina.example', 'Documentos'), suppliers);
  assert.equal(result.tier, 'high');
  assert.equal(result.supplierId, 'S01');
});

test('attachments are recognised as documents only when they look like one', () => {
  assert.deepEqual(documentTypes(['RUT.pdf', 'camara_comercio.pdf', 'Cédula RL.pdf', 'poliza.pdf']), ['rut', 'chamber', 'id-card', 'policy']);
  assert.deepEqual(documentTypes(['tarifas_2027.xlsx', 'propuesta.pdf', 'instrucciones.pdf']), []);
});

test('hostile or empty input does not break the classifier', () => {
  assert.equal(classifyEmail(mail('', ''), suppliers).decision, 'unmatched');
  assert.equal(classifyEmail(mail('x@evil.example', '<img src=x onerror=alert(1)>', { body: '<script>alert(1)</script>' }), suppliers).decision, 'unmatched');
  assert.equal(classifyEmail({}, suppliers).decision, 'unmatched');
});

test('more real cases: long threads, English, document names and lookalikes with a hyphen', () => {
  const r1 = classifyEmail(mail('compras@papeleriaandina.example', 'RE: RE: RV: Documentos CT-2026-014', { attachments: ['RUT 2026 (1).pdf'] }), suppliers);
  assert.equal(r1.tier, 'exact');
  assert.deepEqual(r1.documents, ['rut']);
  const r2 = classifyEmail(mail('ops@logcaribe.example', 'Documents for contract CT-2026-021', { attachments: ['chamber_of_commerce.pdf', 'Bank certificate.pdf'] }), suppliers);
  assert.deepEqual(r2.documents, ['chamber', 'bank-letter']);
  assert.equal(classifyEmail(mail('pagos@papeleria-andina.example', 'Factura'), suppliers).reason.code, 'lookalike-domain');
  const r3 = classifyEmail(mail('ops@logcaribe.example', 'Confirmación de pago factura 123', { body: '¿Nos confirman la fecha de pago a la cuenta registrada?' }), suppliers);
  assert.equal(r3.decision, 'confirmed', 'asking about a payment is not a bank change');
  assert.deepEqual(documentTypes(['Certificado de existencia y representación legal.pdf']), ['chamber']);
});
