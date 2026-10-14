window.proctoringIncidents=[];window.examFinished=false;
const consentCheck=document.getElementById('consentCheck'),studentForm=document.getElementById('studentForm'),startExamBtn=document.getElementById('startExamBtn'),startOverlay=document.getElementById('startOverlay'),securityOverlay=document.getElementById('securityOverlay'),cameraPreview=document.getElementById('cameraPreview'),cameraDot=document.getElementById('cameraDot'),cameraStatus=document.getElementById('cameraStatus'),incidentCount=document.getElementById('incidentCount'),securityBadge=document.getElementById('securityBadge'),startError=document.getElementById('startError'),toast=document.getElementById('toast');
let monitoringActive=false,cameraStream=null,lastIncident={};
let verifiedStudent=null;
const verifyButton=document.getElementById('verifyStudent');
verifyButton.onclick=async()=>{
 const dni=document.getElementById('studentCode').value.trim();
 const password=document.getElementById('studentPassword').value;
 verifyButton.disabled=true;startError.textContent='';
 try{
  const data=await window.examCloud.identify(dni,password);
  verifiedStudent=data.profile;
  for(const [k,v] of Object.entries({verifiedName:data.profile.name,verifiedCareer:data.profile.career,verifiedCycle:data.profile.cycle,verifiedShift:data.profile.shift,verifiedCourses:data.profile.courses.join(', ')}))document.getElementById(k).textContent=v||'No registrado';
  document.getElementById('studentDetails').classList.remove('hidden');
  const sel=document.getElementById('examSelect');sel.replaceChildren(new Option('Seleccione una evaluación',''));
  window.availableExams=data.exams;
  data.exams.forEach(e=>sel.add(new Option(e.title+' ('+e.durationMinutes+' min)',e.id)));
  sel.disabled=!data.exams.length;startExamBtn.disabled=!data.exams.length;
  if(!data.exams.length)startError.textContent='No tienes evaluaciones habilitadas por el docente.';
 }catch(err){verifiedStudent=null;document.getElementById('studentDetails').classList.add('hidden');startExamBtn.disabled=true;startError.textContent='No se pudo validar el acceso. Comprueba el DNI, tu contraseña y la autorización del docente.';console.error(err)}
 finally{verifyButton.disabled=false}
};
for(const id of ['studentCode','studentPassword'])document.getElementById(id).addEventListener('input',()=>{verifiedStudent=null;document.getElementById('studentDetails').classList.add('hidden');document.getElementById('examSelect').disabled=true;startExamBtn.disabled=true});

function showToast(m){toast.textContent=m;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200)}
function registerIncident(type,details=''){if(!monitoringActive||window.examFinished)return;const now=Date.now();if(lastIncident[type]&&now-lastIncident[type]<1200)return;lastIncident[type]=now;const ev={type,details,time:new Date().toISOString()};window.proctoringIncidents.push(ev);window.examCloud?.incident(ev).catch(err=>{console.error('Error guardando incidencia',err);showToast('Error al enviar incidencia. Revisa la conexión.');});incidentCount.textContent=window.proctoringIncidents.length;const c=window.proctoringIncidents.length;if(c>=6){securityBadge.textContent='Revisar';securityBadge.className='badge danger'}else if(c>=2){securityBadge.textContent='Atención';securityBadge.className='badge warning'}showToast('Incidencia registrada: '+type)}
async function startCamera(){if(!navigator.mediaDevices?.getUserMedia)throw new Error('La cámara requiere HTTPS o localhost');cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});cameraPreview.srcObject=cameraStream;cameraDot.className='dot on';cameraStatus.textContent='Cámara activa';cameraStream.getVideoTracks().forEach(t=>t.addEventListener('ended',()=>{cameraDot.className='dot off';cameraStatus.textContent='Cámara desconectada';registerIncident('CÁMARA INTERRUMPIDA')}))}
async function requestFullscreen(){if(!document.fullscreenElement){if(!document.documentElement.requestFullscreen)throw Error('Pantalla completa no disponible');await document.documentElement.requestFullscreen()}}
studentForm.addEventListener('submit',async e=>{
 e.preventDefault();if(!studentForm.reportValidity()||!consentCheck.checked)return;
 startExamBtn.disabled=true;startError.textContent='';
 try{
  // La cámara y fullscreen se solicitan desde el clic del usuario.
  await startCamera();await requestFullscreen();
  const selectedExam=document.getElementById('examSelect');if(!selectedExam.value)throw Error('Selecciona una evaluación');
  const exam=window.availableExams?.find(x=>x.id===selectedExam.value);if(!exam)throw Error('Evaluación no disponible');window.configureExam(exam);
  if(!verifiedStudent)throw Error('Primero valida tu DNI');
  const data={examId:selectedExam.value,dni:document.getElementById('studentCode').value.trim()};
  const result=await window.examCloud.begin(data,'login');
  if(result.state==='blocked'){startError.textContent='Esta cuenta ya finalizó el único intento. Contacta al docente.';window.stopExamMonitoring?.();return;}
  monitoringActive=true;startOverlay.classList.add('hidden');window.startExamClock(result.session);
  if(result.state==='expired')showToast('Se agotó el plazo: se cerrará el intento.');
  else if(result.state==='resume')showToast('Examen recuperado. El temporizador no se reinicia.');
 }catch(err){startError.textContent='No se pudo acceder: '+err.message;console.error(err);if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}}
 finally{startExamBtn.disabled=false}
});
window.stopExamMonitoring=()=>{monitoringActive=false;if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}cameraDot.className='dot off';cameraStatus.textContent='Examen finalizado';if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{})};
document.addEventListener('contextmenu',e=>{if(!monitoringActive)return;e.preventDefault();registerIncident('MENÚ CONTEXTUAL BLOQUEADO')});
['copy','cut','paste'].forEach(n=>document.addEventListener(n,e=>{if(!monitoringActive)return;e.preventDefault();registerIncident(n.toUpperCase()+' BLOQUEADO')}));
document.addEventListener('keydown',e=>{if(!monitoringActive)return;const k=e.key.toLowerCase(),ctrl=e.ctrlKey||e.metaKey;if((ctrl&&['c','x','v','p','s','u'].includes(k))||e.key==='F12'){e.preventDefault();e.stopPropagation();registerIncident('ATAJO BLOQUEADO',e.key)}});
document.addEventListener('visibilitychange',()=>{if(!monitoringActive||window.examFinished)return;if(document.hidden){registerIncident('CAMBIO DE PESTAÑA');securityOverlay.classList.remove('hidden')}else securityOverlay.classList.add('hidden')});
window.addEventListener('blur',()=>{if(monitoringActive&&!window.examFinished)registerIncident('VENTANA SIN FOCO')});
document.addEventListener('fullscreenchange',()=>{if(monitoringActive&&!window.examFinished&&!document.fullscreenElement){registerIncident('SALIDA DE PANTALLA COMPLETA');showToast('Regresa a pantalla completa')}});
window.addEventListener('beforeunload',e=>{if(!monitoringActive||window.examFinished)return;e.preventDefault();e.returnValue=''})

