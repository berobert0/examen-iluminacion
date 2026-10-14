/* Un intento por cuenta Firebase Authentication. Requiere Email/Password. */
(function(){
const cfg=window.FIREBASE_CONFIG;
const configured=cfg&&!Object.values(cfg).some(v=>!v||String(v).includes('REEMPLAZAR'));
let db,auth,ref,activeExamId;
const ready=(async()=>{if(!configured)throw Error('Configura firebase-config.js');firebase.initializeApp(cfg);auth=firebase.auth();db=firebase.firestore();await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)})();ready.catch(()=>{});
const normalize=(v)=>String(v||'').trim();
const mapper=(snap)=>({id:snap.id,...snap.data(),startedMillis:snap.data().startedAt?.toMillis?.()||null});
async function signIn(student,mode){await ready;const email=normalize(student.email).toLowerCase(),pass=student.password;if(mode==='register')await auth.signInWithEmailAndPassword(email,pass);else await auth.signInWithEmailAndPassword(email,pass);if(!auth.currentUser)throw Error('No se pudo autenticar');ref=db.collection('sessions').doc(activeExamId+'_'+auth.currentUser.uid)}
window.examCloud={
 async exams(){await ready;return (await db.collection("exams").where("status","==","published").get()).docs.map(d=>({id:d.id,...d.data()}));},
 async begin(student,mode){
  await signIn(student,mode);
  activeExamId=student.examId;ref=db.collection("sessions").doc(activeExamId+"_"+auth.currentUser.uid);
  const callable=firebase.app().functions('us-central1').httpsCallable('startOrResume');
  await callable({examId:activeExamId});
  const snap=await ref.get({source:'server'}),s=mapper(snap);
  if(s.status!=='en_curso')return {state:'blocked',session:s};
  if(!s.startedMillis)throw Error('No se recibió el inicio del servidor');
  return {state:Date.now()>=s.startedMillis+s.durationMinutes*60000?'expired':'resume',session:s};
 },
 async saveAnswer(qid,index){if(!ref)throw Error('No hay sesión activa');await ref.update({['answers.'+qid]:index});},
 async incident(ev){if(!ref)return;const batch=db.batch();batch.set(ref.collection('incidents').doc(),{uid:auth.currentUser.uid,type:String(ev.type).slice(0,120),details:String(ev.details||'').slice(0,400),clientTime:ev.time,createdAt:firebase.firestore.FieldValue.serverTimestamp()});batch.update(ref,{incidentCount:firebase.firestore.FieldValue.increment(1)});await batch.commit()},
 async finish(report){if(!ref)throw Error('Sin sesión');await firebase.app().functions('us-central1').httpsCallable('submitExam')({examId:activeExamId,reason:report.motivo})},
 async getSession(){if(!ref)throw Error('Sin sesión');return mapper(await ref.get({source:'server'}))}
};
})();
