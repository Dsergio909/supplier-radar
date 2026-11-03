# Cómo funciona Supplier Radar

**Español** · [English](how-it-works.md)

Supplier Radar mantiene al día los documentos y contratos de tus proveedores sin que nadie tenga que revisar el correo a mano. Funciona dentro de Google Workspace (Sheets, Gmail y Drive) y no usa herramientas de pago ni inteligencia artificial externa: los correos nunca salen de tu cuenta de Google.

## El problema

Pedirle documentos a cada proveedor, buscar sus respuestas en Gmail y anotar en una hoja quién ya cumplió es lento y propenso a errores. Lo más común es que la columna "estado" de la hoja diga *al día* para un proveedor que lleva semanas sin responder, porque nadie la actualizó.

## Qué hace, en tres pasos

1. **Pide los documentos.** Escribe a cada proveedor al que todavía no se le han solicitado (RUT, cámara de comercio y certificado bancario) y anota la fecha.
2. **Lee las respuestas.** Revisa la bandeja de entrada, decide qué proveedor envió cada correo y con qué seguridad, guarda los adjuntos en Drive y registra la fecha en que llegaron.
3. **Calcula el estado.** Con las fechas del contrato y de los documentos clasifica a cada proveedor como *vencido*, *en riesgo*, *por vencer* o *al día*, y arma un tablero.

Lo que el sistema no puede decidir con seguridad no lo adivina: lo deja en una hoja de **revisión humana** para que una persona lo asigne o lo descarte.

## Cómo decide de quién es un correo

Cada correo se compara con la lista de proveedores y recibe un nivel de confianza. En la hoja `Registro` aparece con su código en inglés (`exact`, `high`, `medium`, `low`).

| Nivel | Qué tiene que pasar | Qué hace |
|---|---|---|
| **Exacta** | El remitente está registrado **y** el correo cita el número de contrato | Confirma |
| **Alta** | El remitente está registrado | Confirma |
| **Media** | El correo viene del dominio corporativo del proveedor (nunca Gmail, Hotmail ni similares) | Confirma si ese dominio es de un solo proveedor; si lo comparten dos, va a revisión |
| **Baja** | Solo hay un nombre parecido, o un número de contrato enviado desde un correo desconocido | Siempre va a revisión |
| — | No hay ninguna señal de un proveedor (por ejemplo, publicidad) | Se ignora |

**Por qué así:** una confirmación equivocada marca *al día* a un proveedor que no lo está, y eso puede terminar en un pago o un contrato sin respaldo. Mandar un caso de más a revisión cuesta unos segundos. Por eso el sistema prefiere preguntar.

### Protección contra suplantación

Gmail verifica si un correo viene de verdad del dominio que dice (registros SPF y DMARC). Si esa verificación falla, el correo va a revisión **aunque parezca perfecto**, con la marca *posible suplantación*. Es el caso típico de fraude: un correo "del proveedor" que pide cambiar la cuenta bancaria. En la demo es el último correo de la bandeja.

## Cómo calcula el estado de cada proveedor

El estado sale solo de fechas. Se revisa en este orden, del más urgente al menos urgente:

| Estado | Regla |
|---|---|
| **Vencido** | La fecha de fin del contrato ya pasó |
| **En riesgo** | Se pidieron documentos y pasaron más de 7 días sin que lleguen |
| **Por vencer** | Al contrato le quedan 30 días o menos |
| **Al día** | Ninguna de las anteriores |

La tabla muestra también el estado que alguien escribió a mano en la hoja. Si no coincide con el calculado, aparece tachado con la marca *desactualizado*: así se ve de inmediato qué información de la hoja ya no es cierta.

## Cómo usar la demo

La [demo](https://dsergio909.github.io/supplier-radar/) usa la misma lógica que la versión real (la carpeta `src/core`) con 9 proveedores y 10 correos ficticios.

1. Presiona **Procesar bandeja**: el sistema clasifica los correos uno por uno.
2. En **Revisión humana**, mira la evidencia de cada caso y asígnalo a un proveedor o descártalo.
3. En **Proveedores**, mueve la barra de **Fecha simulada** para adelantar el tiempo y ver cómo cambian los estados.

Puedes cambiar entre español e inglés y entre modo claro y oscuro desde la barra superior.

## Instalarlo en tu Google Sheets

No necesitas instalar nada en tu computador.

1. **Crea la hoja de proveedores.** En una hoja de Google, crea una pestaña llamada `Proveedores` e importa [`apps-script/Proveedores-plantilla.csv`](../apps-script/Proveedores-plantilla.csv) (Archivo → Importar). Reemplaza las filas de ejemplo por tus proveedores:

   | Columna | Qué va |
   |---|---|
   | `id` | Un código corto y único, por ejemplo `S01` |
   | `name` | Nombre del proveedor |
   | `domain` | Su dominio de correo corporativo (vacío si usa Gmail u Hotmail) |
   | `emails` | Sus correos registrados, separados por coma |
   | `contractId` | Número de contrato, por ejemplo `CT-2026-014` |
   | `contractEnd` | Fecha de fin del contrato |
   | `docsRequestedAt` / `docsReceivedAt` | Vacías: el sistema las llena |
   | `manualStatus` | Opcional: `expired`, `at-risk`, `expiring` o `active` |

2. **Copia el código.** En la hoja, abre **Extensiones → Apps Script**. Crea un archivo de script por cada `.js` de la carpeta [`apps-script/`](../apps-script) (`Code.js` y los tres `core_*.js`) y pega su contenido. Si usas [clasp](https://github.com/google/clasp), puedes subir la carpeta completa.
3. **Opcional: carpeta de Drive.** Para que los adjuntos se guarden solos, en **Configuración del proyecto → Propiedades del script** agrega `DRIVE_FOLDER_ID` con el ID de la carpeta. Se crea una subcarpeta por proveedor.
4. **Usa el menú.** Recarga la hoja: aparece el menú **Supplier Radar**.

| Opción del menú | Qué hace |
|---|---|
| 1. Solicitar documentos pendientes | Escribe a los proveedores a los que aún no se les han pedido documentos |
| 2. Procesar bandeja de entrada | Clasifica los correos de los últimos 7 días, guarda adjuntos y actualiza fechas |
| 3. Aplicar decisiones de revisión | Aplica lo que escribiste en la hoja `Revisión` (un `id` de proveedor o la palabra `descartar`) |
| 4. Actualizar dashboard | Recalcula el tablero |
| Instalar ejecución automática | Procesa la bandeja cada hora y envía solicitudes cada día a las 8 a. m. |

La primera vez Google te pedirá permisos para leer y enviar correos, editar la hoja y guardar archivos en Drive.

### Hojas que crea el sistema

- **Registro:** cada correo clasificado, con la decisión, el nivel de confianza, la explicación y un enlace al hilo. Nada se borra.
- **Revisión:** los casos dudosos. Escribe en la penúltima columna el `id` del proveedor o `descartar` y usa la opción 3 del menú.
- **Dashboard:** los indicadores y el estado de cada proveedor.

Los correos clasificados quedan con la etiqueta **Supplier Radar** en Gmail. El texto de los correos nunca se escribe como fórmula en la hoja, para evitar que un correo malicioso ejecute algo.

### Ajustes

En `Code.js`, el bloque `CONFIG` permite cambiar los nombres de las pestañas, la búsqueda de Gmail (por defecto, los últimos 7 días sin promociones ni redes sociales), el asunto y el texto de la solicitud, y el idioma de las explicaciones.

## Limitaciones

- Solo ve el buzón de la cuenta que lo ejecuta: si un proveedor responde a otra dirección, no se detecta.
- Sabe *que* llegaron adjuntos, pero no revisa *cuáles* documentos son ni si están vigentes.
- Las búsquedas de Gmail traen hasta 100 hilos por ejecución.

## Cómo explicarlo en 2 minutos

> En mis prácticas de compras, mantener al día los documentos de los proveedores obligaba a pedirlos uno por uno, buscar las respuestas en Gmail y confiar en una columna de estado que nadie actualizaba. Supplier Radar automatiza eso dentro de Google Workspace, sin herramientas de pago. Lo interesante es cómo decide: no dice solo "sí" o "no", sino qué tan seguro está. Si el remitente está registrado y cita el contrato, confirma. Si solo hay un nombre parecido, no adivina: lo manda a una persona. Y si Gmail no puede verificar al remitente, aunque todo parezca correcto, lo marca como posible suplantación, que es como suelen llegar los fraudes de cambio de cuenta bancaria. El estado de cada proveedor se calcula con fechas, no con lo que alguien escribió, y la lógica está cubierta por pruebas automáticas.
