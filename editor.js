(()=>{
const $=id=>document.getElementById(id);const cfg=window.FIREBASE_CONFIG;
if(!cfg||Object.values(cfg).some(v=>!v||String(v).includes('REEMPLAZAR'))){$('authError').textContent='Configura firebase-config.js';return;}
if(!firebase.apps.length)firebase.initializeApp(cfg);
const auth=firebase.auth(),db=firebase.firestore(),fn=firebase.app().functions('us-central1');
let id='',status='draft',q=[];
const call=(name,data)=>fn.httpsCallable(name)(data).then(x=>x.data);
const notify=x=>$('message').textContent=x;
function add(data={text:'',options:['','','',''],correct:0}){q.push({...data});render()}
function render(){const box=$('questions');box.replaceChildren();q.forEach((item,i)=>{
 const div=document.createElement('div');div.className='question';
 const h=document.createElement('h4');h.textContent='Pregunta '+(i+1);div.append(h);
 const textarea=document.createElement('textarea');textarea.className='field';textarea.rows=2;textarea.placeholder='Enunciado';textarea.value=item.text;textarea.oninput=()=>item.text=textarea.value;div.append(textarea);
 item.options.forEach((o,k)=>{const line=document.createElement('label');line.textContent='Alternativa '+String.fromCharCode(65+k);const inp=document.createElement('input');inp.className='field';inp.value=o;inp.oninput=()=>item.options[k]=inp.value;line.append(inp);div.append(line)});
 const label=document.createElement('label');label.textContent='Respuesta correcta';const sel=document.createElement('select');sel.className='field';['A','B','C','D'].forEach((letter,k)=>{const opt=new Option(letter,String(k));sel.append(opt)});sel.value=item.correct;sel.onchange=()=>item.correct=Number(sel.value);label.append(sel);div.append(label);
 const del=document.createElement('button');del.className='btn danger';del.textContent='Eliminar pregunta';del.onclick=()=>{q.splice(i,1);render()};div.append(del);box.append(div);
 });const locked=status!=='draft';box.querySelectorAll('input,textarea,select,button').forEach(e=>e.disabled=locked);$('title').disabled=locked;$('duration').disabled=locked;$('addQuestion').disabled=locked;$('save').disabled=locked;$('publish').disabled=locked||!id;
 $('editorTitle').textContent=(id?'Editar evaluación':'Nueva evaluación')+' — '+(locked?'Publicada (solo lectura)':'Borrador');
}
function reset(){id='';status='draft';q=[];$('title').value='';$('duration').value='30';notify('');add();}
function loadAccess(v){$('mode').value=v.mode||'manual';$('open').checked=!!v.open;const local=t=>{if(!t)return '';const d=t.toDate();const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,16)};$('from').value=local(v.from);$('to').value=local(v.to)}
async function listing(){const snap=await db.collection('exams').orderBy('updatedAt','desc').limit(100).get();const sel=$('examList');sel.replaceChildren(new Option('Nueva evaluación',''));snap.forEach(doc=>sel.append(new Option(doc.data().title+' ('+doc.data().status+')',doc.id)))}
async function load(){const chosen=$('examList').value;if(!chosen)return reset();const [res,doc]=await Promise.all([call('getExamEditor',{id:chosen}),db.doc('exams/'+chosen).get()]);id=chosen;status=res.status;q=res.questions.map(x=>({text:x.text,options:[...x.options],correct:x.correct}));$('title').value=res.title;$('duration').value=res.durationMinutes;loadAccess(doc.data());render();notify('Evaluación cargada.')}
$('authForm').onsubmit=async e=>{e.preventDefault();try{await auth.signInWithEmailAndPassword($('email').value,$('password').value)}catch(err){$('authError').textContent=err.message}};
auth.onAuthStateChanged(async user=>{$('gate').classList.toggle('hidden',!!user);$('workspace').classList.toggle('hidden',!user);if(user){try{await listing();reset()}catch(e){notify('No tienes permisos de administrador: '+e.message)}}});
$('newExam').onclick=()=>{$('examList').value='';reset()};$('loadExam').onclick=()=>load().catch(e=>notify(e.message));$('addQuestion').onclick=()=>add();
$('save').onclick=async()=>{try{const v=await call('saveExam',{id,title:$('title').value,durationMinutes:Number($('duration').value),questions:q});id=v.id;notify('Borrador guardado correctamente.');await listing();$('examList').value=id;render()}catch(e){notify('Error: '+e.message)}};
$('publish').onclick=async()=>{if(!id)return;if(!confirm('¿Publicar? No podrás modificar preguntas ni respuestas correctas de este examen.'))return;try{await call('setExamAccess',{id,action:'publish'});status='published';render();notify('Publicado. Configura abajo la apertura y guarda.');await listing();$('examList').value=id}catch(e){notify('Error: '+e.message)}};
$('saveAccess').onclick=async()=>{if(!id||status!=='published'){notify('Primero debes guardar y publicar el examen.');return}try{const mode=$('mode').value,from=$('from').value?new Date($('from').value).getTime():null,to=$('to').value?new Date($('to').value).getTime():null;await call('setExamAccess',{id,action:'access',mode,open:$('open').checked,from,to});notify('Modalidad y horario guardados.')}catch(e){notify('Error: '+e.message)}};
})();
