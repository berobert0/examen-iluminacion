const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue,Timestamp}=require('firebase-admin/firestore');
const {getAuth}=require('firebase-admin/auth');
const key=require('./answer-key.json');
initializeApp();const db=getFirestore();
const ADMIN_UID='f8AtKNwyyrSUygtmWoqalMOHApX2';
function deny(reason){throw new HttpsError('failed-precondition',reason)}
exports.startOrResume=onCall({region:'us-central1',enforceAppCheck:false},async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','Inicia sesión');
 const uid=request.auth.uid;const ref=db.doc('sessions/'+uid),rosterRef=db.doc('roster/'+uid),configRef=db.doc('config/exam');
 const result=await db.runTransaction(async t=>{
 const [existing,roster,config]=await Promise.all([t.get(ref),t.get(rosterRef),t.get(configRef)]);
 if(!roster.exists||roster.data().approved!==true)throw new HttpsError('permission-denied','Cuenta no autorizada en padrón');
 if(existing.exists)return {status:existing.data().status, resumed:true};
 const settings=config.data();if(!settings)deny('El administrador todavía no ha configurado el acceso');
 const now=Timestamp.now();let allowed=false;
 if(settings.mode==='free')allowed=true;
 if(settings.mode==='manual')allowed=settings.open===true;
 if(settings.mode==='scheduled')allowed=settings.from?.toMillis()<=now.toMillis()&&now.toMillis()<settings.to?.toMillis();
 if(!allowed)deny('El docente aún no habilitó el inicio de la evaluación');
 const st=roster.data();t.create(ref,{uid,studentName:st.name,studentCode:st.dni,group:st.group||'Matriculado',startedAt:FieldValue.serverTimestamp(),durationMinutes:30,status:'en_curso',answers:{},incidentCount:0});
 return {status:'en_curso',resumed:false};
 });return result;
});
exports.submitExam=onCall({region:'us-central1',enforceAppCheck:false},async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','Inicia sesión');
 const uid=request.auth.uid,ref=db.doc('sessions/'+uid);
 return db.runTransaction(async t=>{
 const s=await t.get(ref);if(!s.exists)deny('No hay intento');const v=s.data();
 if(v.status!=='en_curso')return {status:v.status,score20:v.score20??null};
 const now=Timestamp.now();const expired=now.toMillis()>=v.startedAt.toMillis()+1800000;
 const raw=v.answers||{};let hits=0;
 for(const [qid,correct] of Object.entries(key))if(raw[qid]===correct)hits++;
 const score20=Math.round((hits/15)*200)/10;
 t.update(ref,{status:expired?'agotado':'finalizado',endedAt:FieldValue.serverTimestamp(),reason:expired?'Tiempo agotado':'Entrega voluntaria',score20,correctCount:hits,questionCount:15,answeredCount:Object.keys(raw).length});
 return {status:expired?'agotado':'finalizado',score20};
 });
});
