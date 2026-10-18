// Uso SOLO local. npm install firebase-admin
// Establecer GOOGLE_APPLICATION_CREDENTIALS antes de ejecutar.
const fs = require('fs');
const admin = require('firebase-admin');
const data = JSON.parse(fs.readFileSync('padron_PRIVADO.json','utf8'));
const apply = process.argv.includes('--apply');
if (!apply) {
  console.log(`SIMULACIÓN: ${data.length} estudiantes válidos. No se escribió en Firebase.`);
  console.log('Revise revision_DNI.json. Para cargar: node importar_firestore.cjs --apply');
  process.exit(0);
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) throw Error('Falta GOOGLE_APPLICATION_CREDENTIALS: ruta privada a credencial JSON');
admin.initializeApp({credential: admin.credential.applicationDefault(), projectId: 'examen-iluminacion'});
const db=admin.firestore();
(async()=>{
 let created=0,existing=0;
 for (const record of data) {
  // ID estable por DNI; no sobrescribe documentos existentes ni sus permisos.
  const ref=db.collection('estudiantes').doc(record.dni);
  const result=await db.runTransaction(async t=>{
    const snap=await t.get(ref);
    if(snap.exists)return false;
    t.create(ref,{...record, createdAt:admin.firestore.FieldValue.serverTimestamp()});
    return true;
  });
  if(result)created++; else existing++;
 }
 console.log({created,existing,excluded:'Ver revision_DNI.json'});
})().catch(e=>{console.error(e);process.exit(1)});
