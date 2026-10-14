# Plataforma Protección CCF — Ingreso por DNI

## Qué cambia
La página del alumno pide **DNI (8 dígitos) y contraseña individual**. Después de autenticar, la función `getMyAccess` consulta `roster/{uid}` y devuelve apellidos y nombres, carrera, ciclo, turno, cursos y exámenes publicados asignados a esos cursos. No hay consulta pública por DNI. El docente administra los cursos y la publicación desde `editor.html`.

## MUY IMPORTANTE: instalación
1. **No subas automáticamente todo el ZIP a GitHub.** En GitHub Pages solo coloca: `index.html`, `admin.html`, `editor.html`, `styles.css`, `app.js`, `proctoring.js`, `cloud.js`, `admin.js`, `editor.js`. **Conserva tu `firebase-config.js` real que funciona** (el incluido tiene marcadores de ejemplo).
2. Despliega `functions/index.js` con Firebase CLI y `firebase deploy --only functions`, tras instalar `npm --prefix functions install`. Firebase Cloud Functions normalmente exige **plan Blaze**. El backend anterior también debe actualizarse porque se agrega `getMyAccess` y comprobación de cursos.
3. Publica las reglas de `firestore.rules` desde Firebase (o `firebase deploy --only firestore:rules`). Conservan el acceso privado a `roster`. El UID del docente debe ser el autorizado para tu instalación.
4. **El padrón NO se importa automáticamente ni se debe subir a GitHub.** Importa por Admin SDK, desde equipo privado, los campos de matrícula verificados. Usa `private-import/import-roster.js` de forma local con el CSV: `dni,nombre,carrera,ciclo,turno,cursos,clave`. `cursos` se separa por `|`. Las fotografías proporcionadas NO se han transcrito; es necesario revisar el padrón original.
5. La cuenta Authentication se crea como `DNI@acceso.examen.invalid` **internamente**, sin pedir correo al alumno, con clave privada individual asignada por el docente. No se envían cuentas por correo de manera automática. Los estudiantes nunca ven el correo sintético. Si cuentas previas utilizan correos institucionales, necesitarán migración o cuentas nuevas; probar primero con cuentas de ensayo.
6. Desde `editor.html` crea un examen con el campo **Curso / unidad didáctica**. Debe coincidir exactamente con uno de los `cursos` del estudiante en el padrón. El docente debe publicarlo y abrirlo manualmente o elegir modo libre/programado.
7. Prueba con dos cuentas ficticias: acceso autorizado; rechazo de DNI incorrecto; lista filtrada; reingreso con tiempo que no reinicia; intento finalizado bloqueado; nota en panel.

## Seguridad y límites
- DNI por sí solo **NO autentica** al estudiante: se exige contraseña individual. No se publican DNI, teléfonos ni fotografías del padrón.
- El intento único actual es por **cuenta Firebase + examen**. Para impedir múltiples cuentas con el mismo DNI, el alta debe hacerla exclusivamente el administrador desde el script y comprobar DNI únicos antes de importar.
- Las incidencias son detecciones del navegador, no vigilancia infalible.
- Las respuestas correctas están en la colección privada `examKeys`, corregidas en Cloud Functions.
- Padrón, credenciales del Admin SDK y contraseñas nunca se suben a GitHub. Si `private-import` ya está público en el repositorio, verifica que no contenga datos personales o secretos y retíralos (incluido historial si fuera necesario).
- Código preparado y validado sintácticamente, **no probado en tu Firebase real**. Haz una copia y prueba en entorno de ensayo.
