# Examen de Proyecto de Sistema de Iluminación — GitHub Pages + Firebase

## Archivos
- `index.html`: examen del alumno (30 minutos).
- `app.js`, `proctoring.js`, `styles.css`: preguntas, temporizador, interfaz e incidencias.
- `cloud.js`, `firebase-config.js`: almacenamiento centralizado de sesiones e incidencias.
- `admin.html`, `admin.js`: panel privado del docente, filtrado por reglas de Firebase.
- `firestore.rules`: reglas de base de datos **que debes publicar en Firebase**, no se aplican con solo subirlas a GitHub.

## Configuración obligatoria
1. Crea un proyecto en https://console.firebase.google.com/ y registra una **aplicación Web**. Copia sus valores de configuración en `firebase-config.js`.
2. Ve a **Authentication > Sign-in method**. Habilita **Anonymous** (estudiantes) y **Email/Password** (docentes).
3. En **Authentication > Users**, añade una cuenta con correo/contraseña para el docente. Copia su **UID**.
4. Ve a **Firestore Database** y crea una base de datos. En la pestaña **Rules**, pega el contenido de `firestore.rules`, reemplaza `REEMPLAZAR_UID_DOCENTE` por el UID real del docente, y pulsa **Publish**. Evita usar reglas de modo prueba (acceso abierto).
5. En **Authentication > Settings > Authorized domains**, añade `berobert0.github.io` si no aparece.
6. Sube los archivos HTML, CSS, JS y config al directorio raíz del repositorio GitHub Pages. El archivo `firestore.rules` es documentación para pegar en Firebase.
7. Prueba con un estudiante en `https://berobert0.github.io/examen-iluminacion/` y verifica en `https://berobert0.github.io/examen-iluminacion/admin.html` los registros entrando como docente.

## Datos almacenados
Nombre, código, grupo, marcas de tiempo, estado del examen, puntuación resumida (al concluir) e incidencias con fecha y tipo. **No se almacenan vídeo, audio ni capturas.** Cada incidencia se envía al ocurrir. En pérdida de conexión o cierre repentino puede haber eventos no enviados: no equivale a vigilancia infalible.

## Consideraciones esenciales
- No será funcional hasta configurar Firebase y publicar las reglas de Firestore.
- El panel docente exige una cuenta autorizada por UID. No basta con ocultar el enlace o añadir contraseña en HTML.
- Las protecciones del navegador no evitan manipulación avanzada ni el uso de otros dispositivos. Un estudiante técnico podría modificar JS o producir eventos falsos. Para evaluaciones de alta importancia se requiere backend confiable y controles adicionales.
- Las respuestas correctas se incluyen en el JavaScript público. No uses esta versión para exámenes de alta seguridad.
- Publica una política de privacidad y comunica la finalidad y conservación de los datos; limita acceso y define tiempo de borrado, especialmente con estudiantes menores.
- Los datos de Firebase no están alojados en GitHub: GitHub solo hospeda el frontend.
- El temporizador sigue corriendo durante cambios de pestaña; no se detiene al ocultarse.
