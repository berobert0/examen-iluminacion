const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue,Timestamp}=require('firebase-admin/firestore');
initializeApp();
const db=getFirestore();
const ADMIN_UID='f8AtKNwyyrSUygtmWoqalMOHApX2';
const fail=(message,code='failed-precondition')=>{throw new HttpsError(code,message)};
const isAdmin=r=>r.auth?.uid===ADMIN_UID;
const clean=s=>String(s||'').trim();
const dateMillis=t=>t&&typeof t.toMillis==='function'?t.toMillis():null;
const validOptions=q=>Array.isArray(q.options)&&q.options.length===4&&q.options.every(o=>typeof o==='string'&&o.trim().length>=1&&o.length<=500);
function validateExam(data){
 const title=clean(data.title),questions=data.questions;
 if(title.length<5||title.length>150)fail('Título inválido');
 if(!Array.isArray(questions)||questions.length<1||questions.length>60)fail('Entre 1 y 60 preguntas');
 questions.forEach((q,i)=>{if(!q||typeof q.text!=='string'||q.text.trim().length<5||q.text.length>1000||!validOptions(q)||!Number.isInteger(q.correct)||q.correct<0||q.correct>3)fail('Pregunta '+(i+1)+' inválida')});
 const duration=Number(data.durationMinutes);
 if(!Number.isInteger(duration)||duration<5||duration>180)fail('Duración entre 5 y 180 minutos');
 return {title,durationMinutes:duration,questions};
}
exports.saveExam=onCall({region:'us-central1'},async r=>{
 if(!isAdmin(r))fail('Solo el docente puede editar','permission-denied');
 const v=validateExam(r.data||{}),id=clean(r.data.id);
 const ref=id?db.doc('exams/'+id):db.collection('exams').doc();
 await db.runTransaction(async tx=>{
  const old=await tx.get(ref);
  if(id&&!old.exists)fail('Evaluación no encontrada','not-found');
  if(old.exists&&old.data().status!=='draft')fail('Una evaluación publicada ya no se puede editar');
  const publicQuestions=v.questions.map((q,i)=>({id:String(i+1),text:q.text.trim(),options:q.options.map(o=>o.trim())}));
  tx.set(ref,{title:v.title,durationMinutes:v.durationMinutes,questions:publicQuestions,status:'draft',mode:'manual',open:false,from:null,to:null,updatedAt:FieldValue.serverTimestamp(),...(old.exists?{}:{createdAt:FieldValue.serverTimestamp()})},{merge:true});
  tx.set(db.doc('examKeys/'+ref.id),{answers:Object.fromEntries(v.questions.map((q,i)=>[String(i+1),q.correct]))});
 });
 return {id:ref.id};
});
exports.getExamEditor=onCall({region:'us-central1'},async r=>{
 if(!isAdmin(r))fail('Solo docente','permission-denied');
 const id=clean(r.data?.id);if(!id)fail('Falta ID');
 const [a,k]=await Promise.all([db.doc('exams/'+id).get(),db.doc('examKeys/'+id).get()]);
 if(!a.exists||!k.exists)fail('Evaluación no encontrada');
 const v=a.data();return {id,title:v.title,durationMinutes:v.durationMinutes,status:v.status,questions:v.questions.map(q=>({...q,correct:k.data().answers[q.id]}))};
});
exports.setExamAccess=onCall({region:'us-central1'},async r=>{
 if(!isAdmin(r))fail('Solo docente','permission-denied');
 const {id,action,mode,open,from,to}=r.data||{};const ref=db.doc('exams/'+clean(id));
 await db.runTransaction(async tx=>{
  const s=await tx.get(ref);if(!s.exists)fail('No existe el examen');const v=s.data();
  if(action==='publish'){if(v.status!=='draft')fail('Ya publicado');tx.update(ref,{status:'published',updatedAt:FieldValue.serverTimestamp()});return}
  if(action!=='access'||v.status!=='published')fail('Primero publica el examen');
  if(!['manual','free','scheduled'].includes(mode))fail('Modalidad inválida');
  let st=null,en=null;
  if(mode==='scheduled'){
   if(typeof from!=='number'||typeof to!=='number'||!Number.isFinite(from)||!Number.isFinite(to)||to<=from)fail('Fechas inválidas');
   st=Timestamp.fromMillis(from);en=Timestamp.fromMillis(to);
  }
  tx.update(ref,{mode,open:mode==='manual'&&open===true,from:st,to:en,updatedAt:FieldValue.serverTimestamp()});
 });return {ok:true};
});
exports.startOrResume=onCall({region:'us-central1'},async r=>{
 if(!r.auth)fail('Inicia sesión','unauthenticated');
 const examId=clean(r.data?.examId);if(!/^[A-Za-z0-9]{15,40}$/.test(examId))fail('Selecciona un examen válido');
 const uid=r.auth.uid,ref=db.doc(`sessions/${examId}_${uid}`),rosterRef=db.doc('roster/'+uid),examRef=db.doc('exams/'+examId);
 return db.runTransaction(async tx=>{
  const [existing,roster,ex]=await Promise.all([tx.get(ref),tx.get(rosterRef),tx.get(examRef)]);
  if(!roster.exists||roster.data().approved!==true)fail('Cuenta no autorizada en el padrón','permission-denied');
  if(existing.exists)return {status:existing.data().status,resumed:true};
  if(!ex.exists||ex.data().status!=='published')fail('Examen no disponible');
  const v=ex.data(),now=Date.now();let allowed=false;
  if(v.mode==='free')allowed=true;
  if(v.mode==='manual')allowed=v.open===true;
  if(v.mode==='scheduled')allowed=dateMillis(v.from)<=now&&now<dateMillis(v.to);
  if(!allowed)fail('El docente no habilitó el inicio');
  const st=roster.data();
  tx.create(ref,{examId,uid,examTitle:v.title,studentName:st.name,studentCode:st.dni,group:st.group||'Matriculado',startedAt:FieldValue.serverTimestamp(),durationMinutes:v.durationMinutes,status:'en_curso',answers:{},incidentCount:0});
  return {status:'en_curso',resumed:false};
 });
});
exports.submitExam=onCall({region:'us-central1'},async r=>{
 if(!r.auth)fail('Inicia sesión','unauthenticated');
 const examId=clean(r.data?.examId),uid=r.auth.uid,ref=db.doc(`sessions/${examId}_${uid}`);
 if(!/^[A-Za-z0-9]{15,40}$/.test(examId))fail('Examen inválido');
 return db.runTransaction(async tx=>{
  const [s,k,e]=await Promise.all([tx.get(ref),tx.get(db.doc('examKeys/'+examId)),tx.get(db.doc('exams/'+examId))]);
  if(!s.exists||!k.exists||!e.exists)fail('Datos del intento incompletos');
  const v=s.data();if(v.status!=='en_curso')return {status:v.status,score20:v.score20??null};
  const expired=Date.now()>=dateMillis(v.startedAt)+v.durationMinutes*60000;
  const answers=k.data().answers,raw=v.answers||{};let hits=0;
  for(const [qid,correct] of Object.entries(answers))if(raw[qid]===correct)hits++;
  const count=Object.keys(answers).length,score20=Math.round(hits*200/count)/10;
  tx.update(ref,{status:expired?'agotado':'finalizado',endedAt:FieldValue.serverTimestamp(),reason:expired?'Tiempo agotado':'Entrega voluntaria',score20,correctCount:hits,questionCount:count,answeredCount:Object.keys(raw).length});
  return {status:expired?'agotado':'finalizado',score20};
 });
});
