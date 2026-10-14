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
 const title=clean(data.title),questions=data.questions,course=clean(data.course);
 if(title.length<5||title.length>150)fail('Título inválido');
 if(course.length<3||course.length>120)fail('Indica el curso autorizado');
 if(!Array.isArray(questions)||questions.length<1||questions.length>60)fail('Entre 1 y 60 preguntas');
 questions.forEach((q,i)=>{if(!q||typeof q.text!=='string'||q.text.trim().length<5||q.text.length>1000||!validOptions(q)||!Number.isInteger(q.correct)||q.correct<0||q.correct>3)fail('Pregunta '+(i+1)+' inválida')});
 const duration=Number(data.durationMinutes);
 if(!Number.isInteger(duration)||duration<5||duration>180)fail('Duración entre 5 y 180 minutos');
 return {title,course,durationMinutes:duration,questions};
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
  tx.set(ref,{title:v.title,course:v.course,durationMinutes:v.durationMinutes,questions:publicQuestions,status:'draft',mode:'manual',open:false,from:null,to:null,updatedAt:FieldValue.serverTimestamp(),...(old.exists?{}:{createdAt:FieldValue.serverTimestamp()})},{merge:true});
  tx.set(db.doc('examKeys/'+ref.id),{answers:Object.fromEntries(v.questions.map((q,i)=>[String(i+1),q.correct]))});
 });
 return {id:ref.id};
});
exports.getExamEditor=onCall({region:'us-central1'},async r=>{
 if(!isAdmin(r))fail('Solo docente','permission-denied');
 const id=clean(r.data?.id);if(!id)fail('Falta ID');
 const [a,k]=await Promise.all([db.doc('exams/'+id).get(),db.doc('examKeys/'+id).get()]);
 if(!a.exists||!k.exists)fail('Evaluación no encontrada');
 const v=a.data();return {id,title:v.title,course:v.course,durationMinutes:v.durationMinutes,status:v.status,questions:v.questions.map(q=>({...q,correct:k.data().answers[q.id]}))};
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
 if(!r.auth || r.auth.token.firebase.sign_in_provider!=='anonymous')fail('Sesión requerida','unauthenticated');
 const examId=clean(r.data?.examId),dni=clean(r.data?.dni);
 if(!/^[A-Za-z0-9]{15,40}$/.test(examId)||!/^\d{8}$/.test(dni))fail('Datos inválidos');
 const uid=r.auth.uid,ref=db.doc(`sessions/${examId}_${uid}`),claimRef=db.doc(`dniAttempts/${examId}_${dni}`);
 const rosterRef=db.doc('rosterByDni/'+dni),examRef=db.doc('exams/'+examId);
 return db.runTransaction(async tx=>{
  const [claim,existing,roster,ex]=await Promise.all([tx.get(claimRef),tx.get(ref),tx.get(rosterRef),tx.get(examRef)]);
  if(!roster.exists||roster.data().approved!==true)fail('DNI no autorizado','permission-denied');
  if(claim.exists && claim.data().uid!==uid)fail('Este DNI ya tiene un intento asociado a otro navegador. Solicita ayuda al docente.','permission-denied');
  if(existing.exists)return {status:existing.data().status,resumed:true};
  if(claim.exists)fail('El DNI ya está vinculado a un intento','permission-denied');
  if(!ex.exists||ex.data().status!=='published')fail('Examen no disponible');
  const st=roster.data(),v=ex.data();
  if(!Array.isArray(st.courses)||!st.courses.includes(v.course))fail('Curso no autorizado','permission-denied');
  const now=Date.now();const allowed=v.mode==='free'||(v.mode==='manual'&&v.open===true)||(v.mode==='scheduled'&&dateMillis(v.from)<=now&&now<dateMillis(v.to));
  if(!allowed)fail('El docente no habilitó el inicio');
  tx.create(claimRef,{uid,dni,examId,createdAt:FieldValue.serverTimestamp()});
  tx.create(ref,{examId,uid,examTitle:v.title,studentName:st.name,studentCode:dni,group:[st.career,st.cycle,st.shift].filter(Boolean).join(' · '),startedAt:FieldValue.serverTimestamp(),durationMinutes:v.durationMinutes,status:'en_curso',answers:{},incidentCount:0});
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

// Advertencia: DNI solo NO autentica identidad. Limitación inherente a este modo.
exports.getMyAccess=onCall({region:'us-central1'},async r=>{
 if(!r.auth || r.auth.token.firebase.sign_in_provider!=='anonymous')fail('Sesión requerida','unauthenticated');
 const dni=clean(r.data?.dni);if(!/^\d{8}$/.test(dni))fail('DNI inválido');
 const record=await db.doc('rosterByDni/'+dni).get();
 if(!record.exists||record.data().approved!==true)fail('DNI no encontrado o no autorizado','permission-denied');
 const p=record.data();
 const [snapshot,claims]=await Promise.all([db.collection('exams').where('status','==','published').get(),db.collection('dniAttempts').where('dni','==',dni).get()]);
 const attemptMap=new Map(claims.docs.map(d=>[d.data().examId,d.data().uid]));const now=Date.now();
 const exams=snapshot.docs.filter(d=>{const e=d.data();if(!Array.isArray(p.courses)||!p.courses.includes(e.course))return false;
  if(attemptMap.has(d.id))return attemptMap.get(d.id)===r.auth.uid;
  return e.mode==='free'||(e.mode==='manual'&&e.open===true)||(e.mode==='scheduled'&&dateMillis(e.from)<=now&&now<dateMillis(e.to));
 }).map(d=>({id:d.id,title:d.data().title,durationMinutes:d.data().durationMinutes,questions:d.data().questions,course:d.data().course}));
 return {profile:{dni:p.dni,name:p.name,career:p.career||'',cycle:p.cycle||'',shift:p.shift||'',courses:p.courses||[]},exams};
});
