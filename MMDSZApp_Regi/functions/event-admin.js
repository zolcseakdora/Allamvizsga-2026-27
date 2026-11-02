const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

if (!getApps().some((app) => app.name === '[DEFAULT]')) {
  initializeApp();
}

const db = getFirestore();

async function requireHeadOrganizer(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
  }

  const profile = await db.doc(`users/${request.auth.uid}`).get();
  if (profile.data()?.role !== 'Főszervező') {
    throw new HttpsError('permission-denied', 'Ehhez a művelethez főszervezői jogosultság kell.');
  }
}

async function deleteEventDayHandler(request) {
  await requireHeadOrganizer(request);

  const { eventId, dayId } = request.data || {};
  if (
    typeof eventId !== 'string'
    || !eventId.trim()
    || typeof dayId !== 'string'
    || !dayId.trim()
  ) {
    throw new HttpsError('invalid-argument', 'Az esemény vagy a nap azonosítója érvénytelen.');
  }

  const editionRef = db.doc(`events/${eventId}`);
  const dayRef = editionRef.collection('days').doc(dayId);
  await db.runTransaction(async (transaction) => {
    const edition = await transaction.get(editionRef);
    const day = await transaction.get(dayRef);
    const programs = await transaction.get(dayRef.collection('programItems'));

    if (!edition.exists || !day.exists) {
      throw new HttpsError('not-found', 'Az esemény vagy a nap nem található.');
    }
    if (!programs.empty) {
      throw new HttpsError(
        'failed-precondition',
        'A nap csak a hozzá tartozó programok törlése vagy áthelyezése után törölhető.',
      );
    }

    transaction.delete(dayRef);
  });
}

async function deleteEventEditionHandler(request) {
  await requireHeadOrganizer(request);

  const eventId = request.data?.eventId;
  if (typeof eventId !== 'string' || !eventId.trim()) {
    throw new HttpsError('invalid-argument', 'Az esemény azonosítója érvénytelen.');
  }

  const editionRef = db.doc(`events/${eventId}`);
  await db.runTransaction(async (transaction) => {
    const edition = await transaction.get(editionRef);
    const days = await transaction.get(editionRef.collection('days'));
    const teams = await transaction.get(editionRef.collection('teams'));

    if (!edition.exists) {
      throw new HttpsError('not-found', 'Az esemény nem található.');
    }
    if (!days.empty || !teams.empty) {
      throw new HttpsError(
        'failed-precondition',
        'Az esemény csak az összes nap, program és csapat törlése után törölhető.',
      );
    }

    transaction.delete(editionRef);
  });
}

module.exports = {
  deleteEventDay: onCall(deleteEventDayHandler),
  deleteEventEdition: onCall(deleteEventEditionHandler),
  deleteEventDayHandler,
  deleteEventEditionHandler,
};
