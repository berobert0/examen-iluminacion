# Protección CCF — Solo DNI (sin contraseña)

## Comportamiento
- El estudiante escribe **solo su DNI de 8 dígitos** y pulsa «Consultar DNI y cargar datos».
- Una Cloud Function consulta el padrón privado `rosterByDni/{dni}`; muestra apellidos y nombres, carrera, ciclo, turno y cursos. Solo ofrece exámenes publicados y habilitados por el docente para sus cursos.
- Firebase Anonymous Authentication mantiene la misma sesión en el navegador. El primer comienzo crea atómicamente `dniAttempts/{examId}_{dni}` y `sessions/{examId}_{uid}`. Volver al **mismo navegador** continúa el intento y el tiempo original. Otro navegador queda bloqueado para ese DNI y examen.
- Las notas se calculan en Cloud Functions y los incidentes se registran en Firestore.

## ADVERTENCIA CRÍTICA SOBRE IDENTIDAD Y PRIVACIDAD
**Un DNI NO es una contraseña y NO prueba que quien lo escribe sea su titular.** Conocer el DNI de un alumno permite consultar su información académica y comenzar su único intento, incluso bloquearlo. Esta variante es un prototipo para entornos supervisados y **NO es adecuada para una evaluación real no supervisada** ni para exponer datos personales sin un segundo factor. Si es necesario, utiliza un código privado/contraseña, un inicio de sesión escolar o valida presencialmente la identidad antes de abrir el examen. El usuario solicitó expresamente eliminar la contraseña; se hace con esta limitación explícita. Sin contraseña no es posible reanudar desde otro dispositivo sin desbloqueo seguro del docente.

## Instalación
1. **Haz copia del proyecto.** No publiques ni sustituyas la versión en producción antes de probar. No subas el ZIP completo a GitHub.
2. Publica en GitHub Pages solo `index.html`, `admin.html`, `editor.html`, `styles.css`, `app.js`, `proctoring.js`, `cloud.js`, `admin.js`, `editor.js`. **Conserva el `firebase-config.js` real** ya configurado; el ZIP contiene solamente `firebase-config.example.js`.
3. En Firebase Authentication habilita **Anonymous** además de mantener **Email/Password** para el docente. Sin Anonymous, los alumnos no podrán entrar.
4. Activa plan compatible y despliega `functions/index.js` con Firebase CLI: `npm --prefix functions install` y `firebase deploy --only functions`. Si cambias de cuenta, verifica el ID del proyecto con `firebase use`. **Cloud Functions generalmente requiere Blaze**.
5. Publica las reglas nuevas `firestore.rules` mediante `firebase deploy --only firestore:rules` o la consola, solo tras revisarlas.
6. **Importa el padrón de manera privada:** `private-import/import-roster.js` requiere credenciales seguras de Admin SDK y un CSV `dni,nombre,carrera,ciclo,turno,cursos`. No publiques CSV, credenciales ni la carpeta private-import en GitHub. Las fotografías de las listas no han sido transcritas ni importadas.
7. Desde el panel docente crea examen, asigna `course` exactamente igual a `cursos` del padrón y publica/abre el acceso.
8. Prueba con datos FICTICIOS: consulta DNI, autocompletado, inicio único, reanudación en mismo navegador, bloqueo en segundo navegador, tiempo que no se reinicia, incidentes y nota. Revisa políticas de privacidad y obtén los consentimientos necesarios antes de aplicar a estudiantes.

## Notas técnicas
- Las cuentas anteriores `DNI@acceso.examen.invalid` dejan de utilizarse para el ingreso de estudiantes; el administrador mantiene su cuenta con email/contraseña.
- Las reglas impiden que un alumno escriba directamente en `rosterByDni`, `dniAttempts` o `examKeys`. Los controles de servidor asocian un solo intento a cada DNI y examen.
- El bloqueo de segundo navegador protege la unicidad del intento, pero puede bloquear a un estudiante legítimo cuyo DNI conozca otra persona; requiere procedimiento de soporte del docente.
- La detección de incidencias en navegador no es infalible y no graba la cámara.
- Código revisado a nivel sintáctico, **sin prueba real en tu Firebase**.
