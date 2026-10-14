# Examen: Proyecto de Sistema de Iluminación

Examen web de 15 preguntas (selección única) con identificación obligatoria del estudiante, consentimiento, vista previa de cámara, pantalla completa, registro de incidencias y cronómetro de 30 minutos desde el inicio efectivo. Al finalizar calcula la nota sobre 20 y permite descargar un archivo JSON con estudiante, respuestas e incidencias.

## Cómo ejecutar

1. Mantén `index.html`, `styles.css`, `app.js` y `proctoring.js` en la misma carpeta.
2. Utiliza HTTPS o un servidor local, por ejemplo desde la carpeta: `python -m http.server 8000` y abre `http://localhost:8000`.
3. Completa nombre, código y grupo; acepta el consentimiento; permite cámara y pantalla completa. En ese momento inicia el reloj.
4. Al finalizar, descarga el reporte JSON; el navegador **no lo envía automáticamente** a un docente.

## Límites importantes

El navegador puede registrar algunas incidencias, pero **no garantiza** que el usuario no copie, capture pantalla, altere JavaScript o cierre la página. No guarda video, no reconoce personas y no almacena respuestas en un servidor. Un reinicio de página reinicia el examen y pierde el intento; para impedirlo y hacer la evaluación confiable es imprescindible un backend con autenticación, almacenamiento y reloj del servidor. Adapta las preguntas y revisa el consentimiento y las normas locales de privacidad antes de usarlo en clases.
