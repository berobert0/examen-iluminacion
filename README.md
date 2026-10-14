# Examen Proyecto de Sistema de Iluminación — un intento con reanudación

## Funcionamiento
- El estudiante **crea una cuenta** de correo y contraseña la primera vez y registra nombre, código y grupo.
- Firebase Authentication identifica la cuenta. La sesión está en `sessions/{uid}`: no se puede crear otra sesión con el mismo UID.
- Al volver a abrir, elige **«Ya tengo cuenta: continuar el intento»**, introduce sus credenciales (no necesita volver a ingresar nombre, código ni grupo) y puede seguir respondiendo **solo durante los 30 minutos desde la primera vez**.
- Las respuestas se guardan tras cada selección. El tiempo empieza a contarse en la marca de tiempo del servidor Firestore (`startedAt`), no al volver a entrar.
- Las reglas Firestore impiden escribir respuestas después de los 30 minutos y modificar una sesión finalizada.
- El panel de incidencias del docente sigue en `admin.html`.

## Publicación en GitHub Pages + Firebase
1. En https://console.firebase.google.com crea proyecto, aplicación web y Firestore.
2. En **Authentication > Sign-in method** habilita **Email/Password**. **No uses Anonymous para estudiantes**. La cuenta docente también puede usar Email/Password.
3. En Authentication > Settings > Authorized domains agrega `berobert0.github.io` si hace falta.
4. Crea la cuenta docente en Authentication y copia su UID de Users.
5. En `firebase-config.js` coloca los valores de tu aplicación web (no claves privadas). En `firestore.rules`, sustituye `REEMPLAZAR_UID_DOCENTE` por el UID del docente y **publica esas reglas desde Firebase Console > Firestore > Rules**.
6. Sube los archivos descomprimidos a la **raíz** de tu repositorio GitHub, reemplazando los antiguos. La base de datos y sus reglas no se instalan por subir el archivo `.rules` a GitHub.
7. Prueba con una cuenta estudiantil: inicia, responde, cierra, vuelve a acceder como «continuar» y verifica que respuestas y minutos restantes se mantienen. Espera a que caduque y comprueba que no se reciben respuestas nuevas.
8. Abre `https://berobert0.github.io/examen-iluminacion/admin.html` para consultar incidencias.

## Limitaciones importantes
- **Un intento por cuenta, no una identidad humana verificada.** Un estudiante que registre otra cuenta de correo podría conseguir otro intento. Para impedirlo necesitas asignar previamente cuentas únicas o emplear un backend seguro que asocie identificadores verificados con cuentas, y administrar recuperación de contraseña.
- La nota calculada en JavaScript es manipulable; para evaluaciones importantes se necesita corrección en servidor, nunca publicar las respuestas correctas en el frontend.
- El reloj visible depende de la hora del dispositivo, pero Firestore bloquea la escritura de respuestas según **hora del servidor**. El usuario puede alterar visualmente el reloj; el servidor prevalece al guardar.
- Las respuestas se envían inmediatamente; cambios sin conexión pueden no quedar registrados. Un cierre repentino puede impedir guardar la última incidencia. Comprueba el aviso rojo de sincronización.
- Las reglas no permiten un segundo intento una vez que la sesión concluyó. Un administrador que necesite reiniciar a un estudiante debe gestionar esto mediante un backend administrativo controlado; no se ofrece botón inseguro de borrado en HTML.
- La supervisión HTML no bloquea capturas externas o manipulación avanzada. No se graban ni transmiten imágenes de cámara. Informa al alumnado sobre privacidad, finalidad y retención de datos.
