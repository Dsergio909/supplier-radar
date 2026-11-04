# CLAUDE.md

## Antes de empezar: lee la memoria (cerebro)
La memoria de mis proyectos es mi repo **privado** `Dsergio909/cerebro` (copia diaria de mi Obsidian). Al empezar cualquier sesión, antes de proponer o cambiar nada:

1. Abre ese repo (en la nube: agrégalo a la sesión) y lee:
   - `Proyectos/Como trabajar con Sergio.md`: cómo me gusta trabajar, diseño, decisiones tomadas y privacidad.
   - `Como_actualizar_el_cerebro.md`
   - `Proyectos/Supplier Radar.md`: estado y pendientes de este proyecto.
2. Si no puedes abrirlo o la nota todavía no existe, sigue las reglas mínimas de abajo y avísame.
3. Desde la nube el cerebro **solo se lee**. Al terminar con cambios, entrégame un paquete en Markdown con lo que hay que cambiar en cada nota y sección, para pasárselo a Claude Code en mi PC.

## Reglas mínimas (por si no se puede leer el cerebro)
- Háblame en español, simple y paso a paso.
- **Diseño profesional, como software empresarial.** Nada infantil ni con el «look Claude»: sin neón, pixel art, letra de videojuego o de consola, brillos, emojis de adorno ni avatares en caricatura. Estilo de Supplier Radar y Supplier Scout (desde nov-2026): letra del sistema (Segoe UI / -apple-system), fondo claro, un solo azul (#1a5fb4), bordes finos, color solo para estados, modo oscuro automático. El portafolio usa IBM Plex con banda oscura (#14202a) y verde azulado (#0b6b66), aprobado por Sergio.
- **Antes de publicar algo visible** (diseño, textos, imágenes): muéstrame el antes y el después en capturas y espera mi «sí».
- Prueba y audita tú mismo; comprueba con datos reales. Sin cifras inventadas. Quita lo que no sirva.
- No vuelvas a proponer algo que ya se decidió: está en el cerebro.
- Nunca mi número de teléfono, claves, tokens, cédulas ni direcciones exactas. Nada interno de la empresa de mi práctica. Datos de ejemplo siempre ficticios.
- Nada de `push --force` ni borrar ramas o repos sin mi permiso explícito.

## Estado del proyecto (4-nov-2026)
- Demo rediseñada como software de oficina: letra del sistema, azul estándar, tres pestañas (Bandeja, Proveedores, Registro). Diseño elegido por Sergio: mezcla de bandeja tipo Outlook, pregunta guiada y tabla tipo ERP con ficha.
- Un cambio bancario, un remitente no verificado o un dominio parecido no se aplican sin confirmar por teléfono (demo y Apps Script). Se registra quién decide.
- Los documentos se leen por su contenido, no por el nombre del archivo (decisión de Sergio, 4-nov-2026: los proveedores mandan fotos y escaneos). Apps Script usa el OCR de Google Drive; la demo, Tesseract.js y PDF.js servidos desde `demo/vendor` (sin CDN). `src/core/documents.js` dice qué documento es, su fecha de expedición, si está vigente (CONFIG.MAX_AGE_DAYS: cámara/RUT/bancaria 30 días) y si el NIT coincide. Solo se aplica solo lo claro y vigente; lo demás va a la pestaña Documentos. El texto leído nunca se guarda.
- Recordatorios semanales (columna remindedAt).
- Prueba de estrés (4-nov, pedida por Sergio): 201 fotos difíciles de 37 documentos ficticios con diseño real en 15 situaciones (poca luz, reflejo, WhatsApp, pantalla, fax, arrugada, sello, torcida…), 91 sin usar para ajustar. Antes 101/201 bien y 1 aplicado solo con error; ahora 159/201 (79 %), los 37 limpios bien y 0 aplicados con error. La demo prepara la foto como una app de escáner (hoja, luz, líneas, inclinación, tamaño de letra) y la lee 3 veces (`Documents.readAll`). Un RUT sin NIT legible no se aplica solo; cámara y RUT no adivinan la fecha.
- Probado con 35 correos reales que intentan engañarlo, 87 pruebas automáticas, flujos en navegador y accesibilidad (axe) sin fallas. El material de la prueba de estrés no está en el repo (solo 5 lecturas reales como fixtures).
- Pendiente: probar el Apps Script (y el OCR de Drive) en un Gmail real.

## Registro de carrera
Al cerrar ("cierra el chat") o cuando diga "registra esto", revisa si pasó algo que cumpla al menos uno de estos criterios: terminé o entregué algo, tomé una decisión importante con su razón, obtuve un resultado concreto, aprendí una herramienta usándola de verdad, o algo falló y entendí por qué. Si nada cumple, dime "nada para registrar".

Dónde vive el registro (se mudó): en mi Google Drive, carpeta Cerebro: Carrera/REGISTRO.md (registro) y Carrera/00_Carrera.md (formato). Si el formato de abajo difiere de Carrera/00_Carrera.md, manda Carrera/00_Carrera.md.
Si encuentras una copia que dice "Este cerebro se mudó" (por ejemplo, en la antigua carpeta `Cerebro_Carrera`), ignórala.

Esta sesión corre en la nube: aunque veas mi Drive con el conector, NO crees, reemplaces ni subas archivos en ninguna carpeta del cerebro (`Cerebro`). Entrégame UNA entrada en un bloque de código para que yo la pegue al final de Carrera/REGISTRO.md, con este formato:

## AAAA-MM-DD · <Proyecto> · <título corto>
- Qué hice:
- Problema que resuelve:
- Herramientas:
- Resultado o evidencia: (si no hay cifra real, no se inventa)
- Qué aprendí o qué falló:
- ¿Lo puedo defender en entrevista?: sí / parcial (qué me falta)
- ¿Se puede mostrar en público?: sí / no / solo sin datos internos

Máximo 8 líneas. Sin cifras inventadas, sin datos de terceros, sin claves ni rutas privadas.
