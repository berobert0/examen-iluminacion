// Ejecutar LOCALMENTE con credenciales Admin SDK: NO subir CSV ni la clave privada a GitHub.
// CSV UTF-8: dni,nombre,grupo,correo,clave; cada clave debe ser única.
const fs=require('fs'),{initializeApp,applicationDefault}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth'),{getFirestore}=require('firebase-admin/firestore');
initializeApp({credential:applicationDefault(),projectId:'examen-iluminacion'});
const file=process.argv[2];if(!file){console.error('Uso: node import-roster.js padrón.csv');process.exit(1)}
const lines=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);
const headers=lines.shift().split(',').map(x=>x.trim().toLowerCase());
const required=['dni','nombre','grupo','correo','clave'];if(required.some(x=>!headers.includes(x)))throw Error('Faltan columnas: '+required.join(','));
const ids=new Set();(async()=>{for(const line of lines){if(!line.trim())continue;
 const row=Object.fromEntries(line.split(',').map((s,i)=>[headers[i],s.trim()]));
 if(!/^\d{8}$/.test(row.dni)||ids.has(row.dni)||!row.correo.includes('@')||row.clave.length<8){console.error('Fila inválida o duplicada: '+row.dni);continue}ids.add(row.dni);
 try{let user;try{user=await getAuth().getUserByEmail(row.correo)}catch(e){if(e.code!=='auth/user-not-found')throw e;user=await getAuth().createUser({email:row.correo,password:row.clave})}
 await getFirestore().doc('roster/'+user.uid).set({uid:user.uid,dni:row.dni,name:row.nombre,group:row.grupo,approved:true,email:row.correo});console.log('Importado DNI terminado en '+row.dni.slice(-3));}
 catch(e){console.error('Error con DNI terminado en '+row.dni.slice(-3),e.message)}
}})();
