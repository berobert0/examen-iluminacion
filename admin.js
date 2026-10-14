(() => {
const $=id=>document.getElementById(id);
const cfg=window.FIREBASE_CONFIG;
if (!cfg || Object.values(cfg).some(v=>String(v).includes('REEMPLAZAR'))) {
  $('loginError').textContent='Falta configurar firebase-config.js.';return;
}
firebase.initializeApp(cfg);const auth=firebase.auth(),db=firebase.firestore();let sessions=[];
function date(v){if(!v)return '—';const d=v.toDate?v.toDate():new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('es-PE')}
function cell(row,value){const td=document.createElement('td');td.textContent=String(value??'—');row.append(td)}
async function refresh(){
 $('adminError').textContent='';try{
 const snapshot=await db.collection('sessions').orderBy('startedAt','desc').limit(300).get();
 sessions=snapshot.docs.map(d=>({id:d.id,...d.data()}));const tbody=$('sessionRows');tbody.replaceChildren();
 sessions.forEach(s=>{const tr=document.createElement('tr');cell(tr,s.studentName);cell(tr,s.studentCode);cell(tr,s.group);cell(tr,date(s.startedAt)||s.clientStartedAt);cell(tr,s.status);cell(tr,s.incidentCount||0);cell(tr,s.score20??'Pendiente');const td=document.createElement('td'),b=document.createElement('button');b.type='button';b.className='btn secondary';b.textContent='Ver incidencias';b.onclick=()=>details(s);td.append(b);tr.append(td);tbody.append(tr)});
 $('summary').textContent=`${sessions.length} evaluaciones (últimas 300). ${sessions.reduce((x,s)=>x+(s.incidentCount||0),0)} incidencias registradas.`;
 }catch(e){$('adminError').textContent='No se pudo leer la base de datos. Comprueba que tu UID docente esté autorizado en las reglas de Firestore. '+e.message;}}
async function details(s){const pane=$('detail'),out=$('incidentDetails');pane.classList.remove('hidden');out.replaceChildren();const h=document.createElement('p');h.textContent=`${s.studentName} • ${s.studentCode} • ${s.group} • ${s.status}`;out.append(h);try{
 const snapshot=await db.collection('sessions').doc(s.id).collection('incidents').orderBy('createdAt','asc').get();
 if(snapshot.empty){const p=document.createElement('p');p.textContent='Sin incidencias registradas.';out.append(p)}
 snapshot.forEach(doc=>{const v=doc.data(),div=document.createElement('div');div.className='admin-incident';div.textContent=`${date(v.createdAt)||v.clientTime} — ${v.type}${v.details?' — '+v.details:''}`;out.append(div)});
 }catch(e){const p=document.createElement('p');p.className='admin-error';p.textContent='No se pudo cargar el detalle: '+e.message;out.append(p)}pane.scrollIntoView({behavior:'smooth'});}

async function loadSettings(){try{const s=await db.doc('config/exam').get(),v=s.data()||{};$('examMode').value=v.mode||'manual';$('examOpen').checked=!!v.open;const peruvian=d=>{if(!d)return '';const x=d.toDate?d.toDate():new Date(d);return new Date(x.getTime()-5*3600000).toISOString().slice(0,16)};$('examFrom').value=peruvian(v.from);$('examTo').value=peruvian(v.to)}catch(e){$('settingsStatus').textContent='No se pudo leer configuración: '+e.message}}
$('saveSettings').onclick=async()=>{const v={mode:$('examMode').value,open:$('examOpen').checked};const parse=el=>el.value?new Date(el.value+':00-05:00'):null;const from=parse($('examFrom')),to=parse($('examTo'));if(v.mode==='scheduled'&&(!from||!to||to<=from)){$('settingsStatus').textContent='Ingresa un inicio y un fin válidos (hora de Perú).';return}v.from=from?v.mode==='scheduled'?firebase.firestore.Timestamp.fromDate(from):null:null;v.to=to&&v.mode==='scheduled'?firebase.firestore.Timestamp.fromDate(to):null;$('settingsStatus').textContent='Guardando...';try{await db.doc('config/exam').set(v);$('settingsStatus').textContent='Configuración guardada.'}catch(e){$('settingsStatus').textContent='Error: '+e.message}};

$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginError').textContent='';try{await auth.signInWithEmailAndPassword($('email').value,$('password').value)}catch(err){$('loginError').textContent='Acceso fallido: '+err.message}};
auth.onAuthStateChanged(async user=>{$('loginArea').classList.toggle('hidden',!!user);$('dashboard').classList.toggle('hidden',!user);$('detail').classList.add('hidden');if(user){await refresh();await loadSettings()}});
$('logout').onclick=()=>auth.signOut();$('refresh').onclick=refresh;
$('csv').onclick=()=>{const cells=[['Nombre','Código','Grupo','Inicio','Estado','Incidencias','Nota /20','Motivo'],...sessions.map(s=>[s.studentName,s.studentCode,s.group,date(s.startedAt),s.status,s.incidentCount||0,s.score20??'',s.reason||''])];const csv='\uFEFF'+cells.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');const a=document.createElement('a'),u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.href=u;a.download='reporte_docente.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
})();
