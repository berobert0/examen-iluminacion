/* Almacenamiento centralizado con autenticación anónima para alumnos. */
(function () {
  let db, auth, sessionId, currentStudent;
  const config = window.FIREBASE_CONFIG;
  const configured = config && !Object.values(config).some(v => !v || String(v).includes('REEMPLAZAR'));
  const ready = (async () => {
    if (!configured) throw Error('Configura firebase-config.js antes de publicar el examen.');
    firebase.initializeApp(config);
    auth = firebase.auth();
    db = firebase.firestore();
    await auth.signInAnonymously();
  })();
  // Evitar rechazos no capturados antes de que un estudiante pulse Iniciar.
  ready.catch(() => {});
  window.examCloud = {
    async begin(student) {
      await ready;
      if (!auth.currentUser) throw Error('No se pudo autenticar al estudiante');
      currentStudent = student;
      const ref = await db.collection('sessions').add({
        uid: auth.currentUser.uid, studentName: student.name, studentCode: student.code,
        group: student.group, startedAt: firebase.firestore.FieldValue.serverTimestamp(),
        clientStartedAt: new Date().toISOString(), durationMinutes: 30,
        status: 'en_curso', incidentCount: 0
      });
      sessionId = ref.id;
      return sessionId;
    },
    async incident(event) {
      if (!sessionId) return;
      const session = db.collection('sessions').doc(sessionId);
      const batch = db.batch();
      batch.set(session.collection('incidents').doc(), {
        uid: auth.currentUser.uid, type: String(event.type).slice(0,120),
        details: String(event.details || '').slice(0,400),
        clientTime: event.time, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      batch.update(session, {incidentCount: firebase.firestore.FieldValue.increment(1)});
      await batch.commit();
    },
    async finish(report) {
      if (!sessionId) throw Error('No hay sesión registrada');
      await db.collection('sessions').doc(sessionId).update({
        status: 'finalizado', endedAt: firebase.firestore.FieldValue.serverTimestamp(),
        reason: report.motivo, answeredCount: report.respondidas,
        questionCount: report.total, score20: report.notaSobre20,
        incidentCount: report.incidencias.length
      });
    }
  };
})();
