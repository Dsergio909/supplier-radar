/**
 * Synthetic demo data. Names, emails and contract IDs are fictional.
 */
(function (root) {
  'use strict';

  var TODAY = '2026-09-29';

  var suppliers = [
    { id: 'S01', taxId: '900000014', name: 'Papelería Andina SAS', domain: 'papeleriaandina.example', emails: ['compras@papeleriaandina.example'],
      contractId: 'CT-2026-014', contractEnd: '2027-03-31', docsRequestedAt: '2026-09-20', docsReceivedAt: null, manualStatus: 'active',
      rutAt: null, chamberAt: null, bankLetterAt: null, policyAt: '2026-02-10', remindedAt: null },
    { id: 'S02', taxId: '900000021', name: 'Logística del Caribe Ltda', domain: 'logcaribe.example', emails: ['ops@logcaribe.example'],
      contractId: 'CT-2026-021', contractEnd: '2026-10-15', docsRequestedAt: '2026-09-25', docsReceivedAt: null, manualStatus: 'active',
      rutAt: null, chamberAt: null, bankLetterAt: null, policyAt: null, remindedAt: null },
    { id: 'S03', taxId: '900000088', name: 'TecnoSoluciones Integrales', domain: 'tecnosol.example', emails: ['soporte@tecnosol.example'],
      contractId: 'CT-2025-088', contractEnd: '2026-09-10', docsRequestedAt: '2026-08-20', docsReceivedAt: null, manualStatus: 'active',
      rutAt: null, chamberAt: null, bankLetterAt: null, policyAt: null, remindedAt: null },
    { id: 'S04', taxId: '900000031', name: 'Café Origen Export', domain: 'cafeorigen.example', emails: ['contratos@cafeorigen.example'],
      contractId: 'CT-2026-031', contractEnd: '2027-06-30', docsRequestedAt: '2026-09-26', docsReceivedAt: null, manualStatus: 'active',
      rutAt: null, chamberAt: null, bankLetterAt: null, policyAt: null, remindedAt: null },
    { id: 'S05', taxId: '1000000040', name: 'Impresiones Ruiz', domain: '', emails: ['impresionesruiz.demo@gmail.com'],
      contractId: 'CT-2026-040', contractEnd: '2027-01-15', docsRequestedAt: '2026-09-15', docsReceivedAt: null, manualStatus: 'active',
      rutAt: null, chamberAt: null, bankLetterAt: null, policyAt: null, remindedAt: null },
    { id: 'S06', taxId: '900000044', name: 'Nova Seguridad Privada', domain: 'novagrupo.example', emails: ['seguridad@novagrupo.example'],
      contractId: 'CT-2026-044', contractEnd: '2026-12-31', docsRequestedAt: '2026-09-18', docsReceivedAt: null, manualStatus: 'active',
      rutAt: null, chamberAt: null, bankLetterAt: null, policyAt: null, remindedAt: '2026-09-26' },
    { id: 'S07', taxId: '900000045', name: 'Nova Limpieza Industrial', domain: 'novagrupo.example', emails: ['limpieza@novagrupo.example'],
      contractId: 'CT-2026-045', contractEnd: '2027-02-28', docsRequestedAt: '2026-09-18', docsReceivedAt: null, manualStatus: 'at-risk',
      rutAt: null, chamberAt: null, bankLetterAt: null, policyAt: null, remindedAt: null },
    { id: 'S08', taxId: '900000050', name: 'Mobiliario Bogotá', domain: 'mobibog.example', emails: ['ventas@mobibog.example'],
      contractId: 'CT-2026-050', contractEnd: '2027-04-30', docsRequestedAt: '2026-08-01', docsReceivedAt: '2026-08-05', manualStatus: 'active',
      rutAt: '2026-08-05', chamberAt: '2026-08-05', bankLetterAt: '2026-08-05', policyAt: '2026-08-05', remindedAt: null },
    { id: 'S09', taxId: '900000052', name: 'Transportes Sabana', domain: 'transabana.example', emails: ['despachos@transabana.example'],
      contractId: 'CT-2026-052', contractEnd: '2026-10-20', docsRequestedAt: null, docsReceivedAt: null, manualStatus: 'expiring',
      rutAt: null, chamberAt: null, bankLetterAt: null, policyAt: null, remindedAt: null }
  ];

  // `expect` documents the intended outcome; the test suite checks it.
  // `senderVerified: false` simulates an email that failed SPF/DMARC (spoofed).
  var inbox = [
    { id: 'E1', from: 'Compras Papelería Andina <compras@papeleriaandina.example>', subject: 'RE: Documentos contrato CT-2026-014',
      body: 'Buenos días,\n\nAdjuntamos RUT, cámara de comercio y certificación bancaria actualizados.\n\nCordialmente,\nÁrea de compras · Papelería Andina SAS', attachments: ['RUT.pdf', 'camara_comercio.pdf', 'certificacion_bancaria.pdf'],
      expect: { decision: 'confirmed', tier: 'exact', supplierId: 'S01' } },
    { id: 'E2', from: 'ops@logcaribe.example', subject: 'Envío certificado bancario',
      body: 'Hola, quedo atento a cualquier comentario.', attachments: ['certificado_bancario.pdf'],
      expect: { decision: 'confirmed', tier: 'high', supplierId: 'S02' } },
    { id: 'E3', from: 'Laura Méndez <laura.mendez@cafeorigen.example>', subject: 'Documentos solicitados',
      body: 'Hola,\n\nTe comparto lo que pidieron desde compras: RUT, cámara y certificación bancaria.\n\nLaura Méndez\nCafé Origen Export', attachments: ['RUT_CafeOrigen.pdf', 'Camara_Comercio_sep2026.pdf', 'certificacion_bancaria.pdf'],
      expect: { decision: 'confirmed', tier: 'medium', supplierId: 'S04' } },
    { id: 'E4', from: 'Facturación <facturacion@novagrupo.example>', subject: 'Adjuntamos cámara de comercio',
      body: 'Cordial saludo, enviamos el documento del grupo.', attachments: ['camara.pdf'],
      expect: { decision: 'review', tier: 'medium', supplierId: null } },
    { id: 'E5', from: 'Impresiones Ruiz <impresiones.ruiz.demo@gmail.com>', subject: 'Documentos Impresiones Ruiz',
      body: 'Escribo desde otro correo, adjunto lo pedido.', attachments: ['IMG_20260928_093012.jpg'],
      expect: { decision: 'review', tier: 'low', supplierId: 'S05' } },
    { id: 'E6', from: 'juan.perez.demo@hotmail.com', subject: 'Consulta contrato CT-2026-050',
      body: '¿Me confirman la fecha de la próxima entrega?', attachments: [],
      expect: { decision: 'review', tier: 'low', supplierId: 'S08' } },
    { id: 'E7', from: 'Ofertas <news@ofertasmarketing.example>', subject: '¡50% de descuento solo hoy!',
      body: 'No te pierdas nuestras promociones de temporada.', attachments: [],
      expect: { decision: 'unmatched', tier: null, supplierId: null } },
    { id: 'E8', from: 'soporte@tecnosol.example', subject: 'Renovación CT-2025-088',
      body: 'Enviamos propuesta de renovación y documentos vigentes.', attachments: ['propuesta.pdf'],
      expect: { decision: 'confirmed', tier: 'exact', supplierId: 'S03' } },
    { id: 'E9', from: 'Ventas Transportes Sabana <ventas@transabana.example>', subject: 'Tarifas 2027',
      body: 'Compartimos la nueva tabla de tarifas.', attachments: ['tarifas_2027.xlsx'],
      expect: { decision: 'confirmed', tier: 'medium', supplierId: 'S09' } },
    { id: 'E10', from: 'Compras Papelería Andina <compras@papeleriaandina.example>', subject: 'URGENTE: cambio de cuenta bancaria CT-2026-014',
      body: 'Por favor actualicen nuestra cuenta para el próximo pago.', attachments: ['nueva_cuenta.pdf'], senderVerified: false,
      expect: { decision: 'review', tier: 'exact', supplierId: 'S01' } },
    { id: 'E11', from: 'Papelería Andina SAS <compras@papeleriandina.example>', subject: 'Actualización de datos de proveedor',
      body: 'Buen día, por favor diligencien el formulario adjunto para mantener activo su registro.', attachments: ['formulario.pdf'],
      expect: { decision: 'review', tier: 'low', supplierId: 'S01' } },
    { id: 'E12', from: 'ops@logcaribe.example', subject: 'Nuevos datos bancarios para pagos',
      body: 'Hola, a partir de este mes los pagos deben ir a la cuenta del documento adjunto.', attachments: ['cuenta_nueva.pdf'],
      expect: { decision: 'review', tier: 'high', supplierId: 'S02' } }
  ];

  // What each attachment says, as OCR reads it (Drive in Apps Script, Tesseract.js in the demo).
  // Fictional documents. They show what file names cannot: a photo called IMG_….jpg that is a RUT,
  // a file named "sep2026" issued in July, a group's certificate with another company's NIT.
  var documents = {
    'E1/RUT.pdf': 'FORMULARIO DEL REGISTRO ÚNICO TRIBUTARIO\nHoja 1\nDirección de Impuestos y Aduanas Nacionales\n5. Número de Identificación Tributaria (NIT): 900.000.014 - 1\n35. Razón social: PAPELERÍA ANDINA SAS\n53. Responsabilidades, calidades y atributos: 05\nFecha generación documento PDF: 24-09-2026',
    'E1/camara_comercio.pdf': 'CÁMARA DE COMERCIO DE EJEMPLO\nCERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN LEGAL\nFecha Expedición: 25 de septiembre de 2026 Hora: 10:02:11\nNombre: PAPELERÍA ANDINA SAS\nNit: 900.000.014-1\nFecha de matrícula: 3 de mayo de 2012\nFecha de renovación: 28 de marzo de 2026',
    'E1/certificacion_bancaria.pdf': 'BANCO DEMOSTRACIÓN S.A.\nCERTIFICA\nQue PAPELERÍA ANDINA SAS, identificada con NIT 900.000.014-1, posee la cuenta de ahorros No. 000-000000-00, abierta el 2 de febrero de 2015.\nSe expide a solicitud del interesado a los veintiséis (26) días del mes de septiembre de 2026.',
    'E2/certificado_bancario.pdf': 'BANCO DEMOSTRACIÓN S.A.\nCERTIFICACIÓN BANCARIA\nCertificamos que LOGÍSTICA DEL CARIBE LTDA, NIT 900.000.021-6, es titular de la cuenta corriente No. 000-000000-00.\nSe expide a los diez (10) días del mes de julio de 2026.',
    'E3/RUT_CafeOrigen.pdf': 'FORMULARIO DEL REGISTRO ÚNICO TRIBUTARIO\nNúmero de Identificación Tributaria (NIT): 900.000.031 - 2\nRazón social: CAFÉ ORIGEN EXPORT SAS\nResponsabilidades, calidades y atributos: 05\nFecha generación documento PDF: 22-09-2026',
    'E3/Camara_Comercio_sep2026.pdf': 'CÁMARA DE COMERCIO DE EJEMPLO\nCERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN LEGAL\nFecha de expedición: 30/07/2026\nNombre: CAFÉ ORIGEN EXPORT SAS\nNit: 900.000.031-2\nFecha de matrícula: 10 de enero de 2018',
    'E3/certificacion_bancaria.pdf': 'BANCO DEMOSTRACIÓN S.A.\nCERTIFICA\nQue CAFÉ ORIGEN EXPORT SAS, NIT 900.000.031-2, posee la cuenta de ahorros No. 000-000000-00.\nSe expide a los veinticinco (25) días del mes de septiembre de 2026.',
    'E4/camara.pdf': 'CÁMARA DE COMERCIO DE EJEMPLO\nCERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN LEGAL\nFecha de expedición: 20/09/2026\nNombre: NOVA GRUPO EMPRESARIAL SAS\nNit: 900.000.040-8\nFecha de matrícula: 14 de agosto de 2010',
    'E5/IMG_20260928_093012.jpg': 'FORMULARIO DEL REGISTRO ÚNICO TRIBUTARIO\nHOJA 1\nNúmero de Identificación Tributaria (NIT): 1.000.000.040 - 3\nApellidos y nombres: RUIZ PERSONA EJEMPLO\nResponsabilidades, calidades y atributos: 49\nFecha generación documento PDF: 27-09-2026',
    'E8/propuesta.pdf': 'COTIZACIÓN No. 2026-118\nRenovación del contrato CT-2025-088\nSoporte técnico mensual — precio unitario $ 4.200.000\nValidez de la oferta: 30 días\nForma de pago: 30 días',
    'E10/nueva_cuenta.pdf': 'BANCO DEMOSTRACIÓN S.A.\nCERTIFICACIÓN BANCARIA\nCertificamos que el titular de la cuenta de ahorros No. 999-999999-99 es PAPELERÍA ANDINA SAS.\nSe expide el 28 de septiembre de 2026.',
    'E11/formulario.pdf': 'Actualización de datos de proveedores\nNombre de la empresa: ________\nUsuario y contraseña del portal: ________\nNúmero de tarjeta: ________',
    'E12/cuenta_nueva.pdf': 'BANCO DEMOSTRACIÓN S.A.\nCERTIFICACIÓN BANCARIA\nCertificamos que LOGÍSTICA DEL CARIBE LTDA es titular de la cuenta corriente No. 888-888888-88.\nSe expide el 27 de septiembre de 2026.'
  };

  var api = { TODAY: TODAY, suppliers: suppliers, inbox: inbox, documents: documents };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.SampleData = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
