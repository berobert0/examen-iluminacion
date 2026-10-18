# Importación PRIVADA de matrícula 2026-II a Firebase

Este paquete contiene DNI y nombres de estudiantes. **No lo subas a GitHub, Google Sites ni lo compartas públicamente.** Guárdalo en equipo autorizado y bórralo cuando termines.

## Resumen

- Hojas: EI-2-D (33), EI-6-D (19), EI-6-N (16). 68 registros de matrícula.
- Registros válidos para importar: 67.
- Revisar: un DNI de 9 dígitos en EI-2-D; ver `revision_DNI.json` y corregir en el Excel original.
- No se han inferido cursos regulares: `unidadesRepetencia` proviene solo de la columna correspondiente. El docente debe asignar cursos reales por matrícula.
- Se incluye `dni`, `nombre`, `carrera`, `ciclo`, `turno`, `condicion`, `tipoMatricula`, `unidadesRepetencia`, `autorizado`, `fuente`, `periodo`.
- Los ciclos se guardan como 2 o 6 según el Excel: verificar qué espera tu código antes de subir.

## Antes de usar

1. **Verifica la estructura esperada por la Cloud Function** de consulta de DNI; puede requerir campos/IDs distintos. Este script crea `estudiantes/{DNI}` y **no actualiza** documentos existentes con otro ID (por ejemplo, documentos por nombre).
2. Revisa `revision_DNI.json` y corrige el error en Excel.
3. Respalda Firestore y revisa reglas para impedir lectura pública/anónima del padrón.
4. Comprueba que tienes permiso institucional para tratar los datos.

## Importar desde una computadora autorizada

1. Instala Node.js y ejecuta `npm install firebase-admin` en una carpeta privada.
2. En Firebase Console → Configuración del proyecto → Cuentas de servicio, genera una credencial **solo si estás autorizado**. Guárdala fuera del repositorio. Alternativamente utiliza autenticación de Google Cloud con credenciales de aplicación.
3. Configura `GOOGLE_APPLICATION_CREDENTIALS` con la ruta local al JSON de credenciales. No compartas este archivo.
4. En esta carpeta, ejecuta `node importar_firestore.cjs` para simulación (no escribe nada).
5. Ejecuta `node importar_firestore.cjs --apply` para crear únicamente los documentos nuevos.
6. Verifica los documentos en Firestore y realiza pruebas con cuentas de ensayo.

**Advertencia:** El script no activa por sí mismo búsqueda por DNI, autentificación, Cloud Functions, reglas, ni asignación de exámenes. La lógica de DNI sola permite suplantación; utiliza supervisión y protección anti-enumeración antes de producción.
