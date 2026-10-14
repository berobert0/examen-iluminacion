/* Un intento por cuenta Firebase Authentication. Requiere Email/Password. */
(function(){
const cfg=window.FIREBASE_CONFIG;
const configured=cfg&&!Object.values(cfg).some(v=>!v||String(v).includes('REEMPLAZAR'));
let db,auth,ref;
const ready=(async()=>{if(!configured)throw Error('Configura firebase-config.js');firebase.initializeApp(cfg);auth=firebase.auth();db=firebase.firestore();await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)})();ready.catch(()=>{});
const normalize=(v)=>String(v||'').trim();
const mapper=(snap)=>({id:snap.id,...snap.data(),startedMillis:snap.data().startedAt?.toMillis?.()||null});
async function signIn(student,mode){await ready;const email=normalize(student.email).toLowerCase(),pass=student.password;if(mode==='register')await auth.createUserWithEmailAndPassword(email,pass);else await auth.signInWithEmailAndPassword(email,pass);if(!auth.currentUser)throw Error('No se pudo autenticar');ref=db.collection('sessions').doc(auth.currentUser.uid)}
window.examCloud={
 async begin(student,mode){await signIn(student,mode);const clean={name:normalize(student.name),code:normalize(student.code),group:normalize(student.group)};
 const state=await db.runTransaction(async t=>{const snap=await t.get(ref);if(snap.exists)return {exists:true,data:mapper(snap)};
 if(mode!=='register')throw Error('Esta cuenta no tiene examen iniciado. Usa «Crear cuenta» para comenzar.');
 if(clean.name.length<5||clean.code.length<4||!clean.group)throw Error('Completa correctamente la identificación.');
 t.set(ref,{uid:auth.currentUser.uid,studentName:clean.name,studentCode:clean.code,group:clean.group,startedAt:firebase.firestore.FieldValue.serverTimestamp(),durationMinutes:30,status:'en_curso',answers:{},incidentCount:0});return {exists:false};});
 // Leer la marca de tiempo del servidor, no crear un nuevo reloj en el navegador.
 const snap=await ref.get({source:'server'}),s=mapper(snap);
 if(s.status==='finalizado'||s.status==='agotado')return {state:'blocked',session:s};
 if(!s.startedMillis)throw Error('No se pudo obtener el inicio desde Firestore. Intenta de nuevo.');
 return {state:Date.now()>=s.startedMillis+1800000?'expired':state.exists?'resume':'new',session:s};
 },
 async saveAnswer(qid,index){if(!ref)throw Error('No hay sesión activa');await ref.update({['answers.'+qid]:index});},
 async incident(ev){if(!ref)return;const batch=db.batch();batch.set(ref.collection('incidents').doc(),{uid:auth.currentUser.uid,type:String(ev.type).slice(0,120),details:String(ev.details||'').slice(0,400),clientTime:ev.time,createdAt:firebase.firestore.FieldValue.serverTimestamp()});batch.update(ref,{incidentCount:firebase.firestore.FieldValue.increment(1)});await batch.commit()},
 async finish(report){if(!ref)throw Error('Sin sesión');await ref.update({status:report.motivo==='Tiempo agotado'?'agotado':'finalizado',endedAt:firebase.firestore.FieldValue.serverTimestamp(),reason:report.motivo})},
 async getSession(){if(!ref)throw Error('Sin sesión');return mapper(await ref.get({source:'server'}))}
};
})();
