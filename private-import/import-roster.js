// Ejecutar LOCALMENTE con credenciales Admin SDK. Nunca publicar datos personales.
const fs=require('fs');
const {initializeApp,applicationDefault}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
initializeApp({credential:applicationDefault(),projectId:'examen-iluminacion'});
// CSV sencillo sin comas dentro de campos: dni,nombre,carrera,ciclo,turno,cursos
// cursos separados por |. Revisar DNI y campos originales antes de importar.
const file=process.argv[2];if(!file)throw Error('Uso: node import-roster.js estudiantes.csv');
const rows=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);
const headers=rows.shift().split(',').map(x=>x.trim().toLowerCase());
const required=['dni','nombre','carrera','ciclo','turno','cursos'];if(required.some(k=>!headers.includes(k)))throw Error('Columnas faltantes');
(async()=>{const seen=new Set();let n=0;for(const line of rows){if(!line.trim())continue;const cols=line.split(',');const x=Object.fromEntries(headers.map((h,i)=>[h,(cols[i]||'').trim()]));const courses=x.cursos.split('|').map(s=>s.trim()).filter(Boolean);
 if(!/^\d{8}$/.test(x.dni)||seen.has(x.dni)||!x.nombre||!courses.length)throw Error('DNI duplicado o fila inválida; detén la importación y revisa el padrón');
 seen.add(x.dni);await getFirestore().doc('rosterByDni/'+x.dni).set({dni:x.dni,name:x.nombre,career:x.carrera,cycle:x.ciclo,shift:x.turno,courses,approved:true});n++;}
 console.log('Estudiantes importados:',n)})().catch(e=>{console.error(e);process.exitCode=1});
