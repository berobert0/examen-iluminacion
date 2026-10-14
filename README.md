# Plataforma de evaluaciones · Editor docente

## Archivos de GitHub Pages
Sube `index.html`, `admin.html`, `editor.html`, `styles.css`, `app.js`, `proctoring.js`, `cloud.js`, `admin.js`, `editor.js`, `firebase-config.js` a la RAÍZ del repositorio. **No subas** la carpeta `private-import`, `functions/`, la clave de respuestas ni datos personales. `firebase-config.js` del paquete lleva valores de ejemplo; conserva tu configuración real de GitHub al actualizar.

## Configurar Firebase (requerido para que funcione)
1. Haz una copia de la versión anterior. Prueba todo en un proyecto de Firebase de ensayo antes de sustituir la versión en uso.
2. En Firebase Authentication habilita Email/Password y registra la cuenta docente autorizada por UID. El UID que hay en las reglas y `functions/index.js` corresponde al que facilitaste; cámbialo si el administrador cambia.
3. Actualiza las reglas de Firestore con `firestore.rules` (usa Firebase CLI `firebase deploy --only firestore:rules`, o pégalas completas en la consola). **Estas reglas sustituyen las anteriores**.
4. Para las funciones necesitas Firebase CLI, Node.js y Firebase Cloud Functions (habitualmente plan Blaze). Desde la carpeta del proyecto: `npm --prefix functions install`, `firebase login`, `firebase use examen-iluminacion` y `firebase deploy --only functions`. Verifica que la región sea `us-central1`.
5. Las colecciones `exams`, `examKeys` y `sessions` se crean automáticamente al utilizar el editor y las funciones. `examKeys` es privada: nunca la expongas en HTML/JS.
6. Importa el padrón a Firestore de forma privada en `roster/{UID_DEL_ESTUDIANTE}`, con campos `{name,dni,group,approved:true}`; usa el script privado de la carpeta `private-import` después de revisarlo. No subas esos documentos ni su CSV a GitHub.
7. Abre `editor.html` como docente, inicia sesión, crea un examen con preguntas y respuestas correctas, guarda borrador, publica, y configura acceso manual/libre/programado. Luego los alumnos podrán elegir exámenes publicados en `index.html`.

## Comportamiento
- Los exámenes publicados son inmutables para preservar las notas. Para modificar uno, prepara una nueva evaluación.
- Un intento por combinación **cuenta Firebase + examen**; la sesión se guarda en `sessions/{examId}_{uid}`. Las respuestas se guardan durante el plazo original, y el cierre/envío calcula nota sobre 20 en Cloud Functions.
- El control de acceso restringe **nuevos** inicios. Una sesión existente puede retomarse hasta su límite sin reiniciar el reloj.
- Las incidencias son eventos detectados por el navegador, no pruebas absolutas de conducta.
- El padrón y la correspondencia DNI/UID deben ser gestionados por el docente. Un DNI escrito en un campo del navegador NO prueba identidad; utiliza cuentas individuales controladas y no permitas auto-registros abiertos.
- La política de privacidad, retención de datos, permisos de cámara, cumplimiento normativo, respaldos y derechos de los estudiantes deben definirse antes de producción.

## Advertencias
**No basta con subir el ZIP a GitHub**. Hasta desplegar Cloud Functions, las reglas y el padrón, el editor y los intentos no funcionarán. No verificados contra tu Firebase real. El panel de administración original usa una lista global de sesiones con límite de 300 resultados y no aplica filtros por examen. Prueba con cuentas de ensayo.

`firebase-config.js` debe conservar los valores REALES configurados en tu instalación previa; no compartas contraseñas ni claves de servicio.
