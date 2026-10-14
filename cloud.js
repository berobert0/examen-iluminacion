/* Acceso por DNI solamente: NO constituye verificación de identidad. */
(function(){
const cfg=window.FIREBASE_CONFIG;
const configured=cfg&&!Object.values(cfg).some(v=>!v||String(v).includes('REEMPLAZAR'));
let db,auth,ref,activeExamId,verified=null;
const ready=(async()=>{if(!configured)throw Error('Configura firebase-config.js');firebase.initializeApp(cfg);auth=firebase.auth();db=firebase.firestore();await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)})();ready.catch(()=>{});
const mapper=snap=>({id:snap.id,...snap.data(),startedMillis:snap.data().startedAt?.toMillis?.()||null});
async function identity(dni){
 await ready;
 if(!/^\d{8}$/.test(dni))throw Error('Introduce los 8 dígitos de tu DNI');
 // Persistencia local: sesión anónima recuperable al cerrar y abrir este navegador.
 if(!auth.currentUser || !auth.currentUser.isAnonymous){await auth.signOut();await auth.signInAnonymously()}
 const res=(await firebase.app().functions('us-central1').httpsCallable('getMyAccess')({dni})).data;
 verified={dni,uid:auth.currentUser.uid,exams:res.exams};return res;
}
window.examCloud={
 identify:identity,
 async begin(student){
  if(!verified||verified.dni!==student.dni||verified.uid!==auth.currentUser?.uid)throw Error('Primero consulta tu DNI');
  if(!verified.exams.some(e=>e.id===student.examId))throw Error('Evaluación no habilitada');
  activeExamId=student.examId;
  const result=(await firebase.app().functions('us-central1').httpsCallable('startOrResume')({examId:activeExamId,dni:student.dni})).data;
  if(result.status!=='en_curso')return {state:'blocked',session:result};
  ref=db.collection('sessions').doc(activeExamId+'_'+auth.currentUser.uid);
  const snap=await ref.get({source:'server'});if(!snap.exists)throw Error('No se encontró el intento');
  const s=mapper(snap);if(!s.startedMillis)throw Error('No se recibió el inicio');
  return {state:Date.now()>=s.startedMillis+s.durationMinutes*60000?'expired':'resume',session:s};
 },
 async saveAnswer(qid,index){if(!ref)throw Error('No hay sesión');await ref.update({['answers.'+qid]:index})},
 async incident(ev){if(!ref)return;const b=db.batch();b.set(ref.collection('incidents').doc(),{uid:auth.currentUser.uid,type:String(ev.type).slice(0,120),details:String(ev.details||'').slice(0,400),clientTime:ev.time,createdAt:firebase.firestore.FieldValue.serverTimestamp()});b.update(ref,{incidentCount:firebase.firestore.FieldValue.increment(1)});await b.commit()},
 async finish(report){if(!ref)throw Error('Sin sesión');return (await firebase.app().functions('us-central1').httpsCallable('submitExam')({examId:activeExamId,reason:report.motivo})).data},
 async getSession(){if(!ref)throw Error('Sin sesión');return mapper(await ref.get({source:'server'}))}
};
})();
