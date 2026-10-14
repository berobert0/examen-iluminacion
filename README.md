# Examen de Iluminación: control libre, manual y programado

## Estado: requiere despliegue de backend antes de usarse

### Arquitectura
- GitHub Pages: `index.html`, `admin.html`, JS y CSS.
- Firebase Authentication: cuentas individuales **preasignadas**. Se eliminó el registro público de alumnos.
- Firestore: `config/exam` (modo), `roster/{uid}` (alumno autorizado, privado), `sessions/{uid}` e incidencias.
- Cloud Functions: `startOrResume` crea la sesión una vez tras verificar el padrón y ventana de acceso; `submitExam` calcula nota oficial sobre 20 desde clave privada en servidor.

### Preparación (obligatoria)
1. Guardar copia de los archivos actuales de GitHub.
2. En `firebase-config.js`, **copiar de la versión activa de tu GitHub** la configuración real. El ZIP contiene marcadores de ejemplo porque no se dispone de tu API Key exacta.
3. En Firebase → Authentication → Settings → Authorized domains, autorizar `berobert0.github.io` si no está.
4. El proyecto debe permitir desplegar Firebase Cloud Functions (**normalmente requiere Blaze y facturación habilitada**). Instalar Node.js y Firebase CLI (`npm install -g firebase-tools`), ejecutar `firebase login` y en la carpeta raíz `firebase deploy --only firestore:rules,functions --project examen-iluminacion`.
5. IMPORTANTE: `firestore.rules` incluye el UID de docente previamente proporcionado. Verificar que siga siendo correcto antes de desplegar.
6. En Firestore, crear `config/exam` desde el panel de docente en modo manual cerrado inicialmente. Para ello, el docente inicia sesión y guarda la configuración.
7. Cargar el padrón por **fuera de GitHub**: convertir las listas originales legibles a un CSV privado con cabeceras `dni,nombre,grupo,correo,clave`; verificar DNI y correo. `private-import/import-roster.js` requiere un entorno local confiable y credencial de administrador (Application Default Credentials). Ejecutar en carpeta con `firebase-admin` instalado. No subir la lista, credenciales de estudiantes ni llaves privadas a repositorios públicos.
8. Cargar en GitHub Pages solamente los archivos estáticos de la raíz: `index.html`, `admin.html`, `app.js`, `admin.js`, `cloud.js`, `proctoring.js`, `styles.css`, `firebase-config.js`.
9. Probar con una cuenta ficticia de prueba antes de utilizar datos reales.

### Modalidades
- Manual: el docente marca acceso habilitado o cerrado.
- Libre: los alumnos del padrón pueden iniciar en cualquier momento.
- Programada: permite inicios solo entre fechas y horas (el formulario interpreta horario de Perú, UTC−5).
- Cerrar nuevas entradas **no detiene** sesiones ya iniciadas. Cada intento conserva sus 30 minutos desde `startedAt` del servidor.
- El bloqueo es **por UID preasignado de Firebase**, que está ligado al DNI del padrón; no se verifica identidad biométrica.

### Notas y cautelas
- La nota en Firestore la determina Cloud Functions usando `functions/answer-key.json`, y aparece en el panel y CSV. El código de respuestas correctas ya no está en `app.js`.
- Los alumnos pueden revisar preguntas y enviar respuestas durante su ventana de 30 minutos; no pueden sobrescribir la nota por reglas.
- Si un alumno no pulsa finalizar, la sesión puede mostrar «en curso» incluso después del límite hasta que vuelva a ingresar y el cliente invoque `submitExam`. Para cierre completamente automático sin visita se requiere un trabajo programado o una función que cierre sesiones vencidas.
- La detección de incidencias del navegador no es inviolable y la cámara es una vista local sin grabación.
- Las reglas y el código deben probarse con Firebase Emulator Suite antes de abrir a estudiantes reales. El padrón completo debe gestionarse conforme a las políticas de privacidad aplicables.
