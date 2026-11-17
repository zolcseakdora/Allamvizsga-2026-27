const { getApps, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { randomUUID } = require('node:crypto');
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

async function registerFebrutalisTeamHandler(request) {
  return assignFebrutalisTeamCaptainHandler(request);
}

async function joinFebrutalisTeamHandler(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
  }
  throw new HttpsError(
    'failed-precondition',
    'A Februtális-csapatba történő besorolást a főszervező végzi.',
  );
}

async function assignFebrutalisTeamCaptainHandler(request) {
  await requireHeadOrganizer(request);

  const teamKey = request.data?.teamKey;
  const captainUid = request.data?.captainUid;
  if (
    typeof teamKey !== 'string'
    || teamKey.length < 2
    || teamKey.length > 60
    || teamKey !== teamKey.toLowerCase()
    || typeof captainUid !== 'string'
    || !captainUid
  ) {
    throw new HttpsError('invalid-argument', 'Érvénytelen csapatnév vagy kapitány.');
  }

  const registrationsSnapshot = await db.collection('event_registrations')
    .where('teamKey', '==', teamKey)
    .get();
  const registrationDocs = registrationsSnapshot.docs.filter((registration) => (
    registration.data().eventType === 'februtalis'
  ));
  const registrations = {
    docs: registrationDocs,
    empty: registrationDocs.length === 0,
    size: registrationDocs.length,
  };
  if (registrations.empty) {
    throw new HttpsError('not-found', 'Ehhez a csapatnévhez nem található Februtális-regisztráció.');
  }
  if (registrations.size > 400) {
    throw new HttpsError('failed-precondition', 'A csapathoz túl sok regisztráció tartozik.');
  }
  const registrationData = registrations.docs.map((registration) => registration.data());
  if (registrationData.some((data, index) => (
    typeof data.uid !== 'string'
    || registrations.docs[index].id !== `${data.uid}_februtalis`
    || data.eventType !== 'februtalis'
    || data.teamKey !== teamKey
    || typeof data.teamName !== 'string'
  ))) {
    throw new HttpsError('failed-precondition', 'A csapat regisztrációs adatai érvénytelenek.');
  }

  const captainRegistration = registrations.docs.find((registration) => (
    registration.data().uid === captainUid
  ));
  if (!captainRegistration) {
    throw new HttpsError('permission-denied', 'A kiválasztott kapitány nem ehhez a csapathoz regisztrált.');
  }

  const teamName = typeof registrations.docs[0].data().teamName === 'string'
    ? registrations.docs[0].data().teamName.trim().replace(/\s+/g, ' ')
    : '';
  if (teamName.length < 2 || teamName.toLowerCase() !== teamKey) {
    throw new HttpsError('failed-precondition', 'A regisztrált csapatnév érvénytelen.');
  }

  const teamQuery = db.collection('teams')
    .where('eventType', '==', 'februtalis')
    .where('nameKey', '==', teamKey);
  const newTeamRef = db.collection('teams').doc();

  const teamId = await db.runTransaction(async (transaction) => {
    const [existingTeams, userSnapshots] = await Promise.all([
      transaction.get(teamQuery),
      Promise.all(registrations.docs.map((registration) => (
        transaction.get(db.doc(`users/${registration.data().uid}`))
      ))),
    ]);
    if (existingTeams.size > 1) {
      throw new HttpsError('failed-precondition', 'Több Februtális-csapat tartozik ehhez a névhez.');
    }

    const teamRef = existingTeams.empty ? newTeamRef : existingTeams.docs[0].ref;
    const eligibleMembers = registrations.docs.flatMap((registration, index) => {
      const profile = userSnapshots[index];
      if (!profile.exists || profile.data()?.isVerified !== true) return [];
      const role = profile.data()?.role;
      const eventRole = profile.data()?.eventMemberships?.februtalis?.role;
      if (
        !['Csapattag', 'Csapatkapitány', 'Alcsapatkapitány'].includes(role)
        || (eventRole !== undefined
          && !['Csapattag', 'Csapatkapitány', 'Alcsapatkapitány'].includes(eventRole))
      ) return [];
      const currentTeamId = profile.data()?.eventMemberships?.februtalis?.teamId;
      if (currentTeamId && currentTeamId !== teamRef.id) {
        throw new HttpsError('failed-precondition', 'Egy résztvevő már másik Februtális-csapathoz tartozik.');
      }
      return [{ uid: registration.data().uid, profileRef: profile.ref }];
    });

    if (!eligibleMembers.some((member) => member.uid === captainUid)) {
      throw new HttpsError('failed-precondition', 'A kapitánynak jóváhagyott Februtális-regisztrációval kell rendelkeznie.');
    }

    transaction.set(teamRef, {
      name: teamName,
      nameKey: teamKey,
      eventType: 'februtalis',
      captainUid,
    }, { merge: true });
    eligibleMembers.forEach(({ uid, profileRef }) => {
      transaction.update(profileRef, {
        'eventMemberships.februtalis': {
          teamId: teamRef.id,
          role: uid === captainUid ? 'Csapatkapitány' : 'Csapattag',
        },
      });
    });
    return teamRef.id;
  });

  return { teamId, captainUid };
}

async function publishNotificationHandler(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
  }
  const profile = await db.doc(`users/${request.auth.uid}`).get();
  if (!profile.exists || profile.data()?.role !== 'Főszervező') {
    throw new HttpsError('permission-denied', 'Ehhez a művelethez főszervezői jogosultság kell.');
  }

  const { title, body, eventType, audience, notificationId } = request.data || {};
  if (
    typeof title !== 'string'
    || !title.trim()
    || title.trim().length > 120
    || typeof body !== 'string'
    || !body.trim()
    || body.trim().length > 4000
    || (eventType !== 'februtalis' && eventType !== 'diaknapok')
    || !['everyone', 'captains', 'organizers'].includes(audience)
    || typeof notificationId !== 'string'
    || !/^[A-Za-z0-9_-]{20}$/.test(notificationId)
  ) {
    throw new HttpsError('invalid-argument', 'Az értesítés adatai érvénytelenek.');
  }

  const notificationRef = db.collection('notifications').doc(notificationId);
  await notificationRef.create({
    title: title.trim(),
    body: body.trim(),
    eventType,
    audience,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
    createdByName: typeof profile.data()?.name === 'string' ? profile.data().name : '',
  });
  return { notificationId };
}

async function listFebrutalisRegistrationsHandler(request) {
  await requireHeadOrganizer(request);

  const registrations = await db.collection('event_registrations')
    .where('eventType', '==', 'februtalis')
    .get();
  return {
    registrations: registrations.docs.map((registration) => {
      const data = registration.data();
      return {
        ...(typeof data.uid === 'string' ? { uid: data.uid } : {}),
        ...(typeof data.teamName === 'string' ? { teamName: data.teamName } : {}),
        ...(typeof data.teamKey === 'string' ? { teamKey: data.teamKey } : {}),
      };
    }),
  };
}

async function submitStudentVerificationHandler(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
  }
  const { eventType, storagePath } = request.data || {};
  const expectedPathPrefix = `student-verifications/${request.auth.uid}/${eventType}/`;
  if (
    (eventType !== 'februtalis' && eventType !== 'diaknapok')
    || typeof storagePath !== 'string'
    || !storagePath.startsWith(expectedPathPrefix)
    || !/^[A-Za-z0-9_-]+\.jpg$/.test(storagePath.slice(expectedPathPrefix.length))
  ) {
    throw new HttpsError('invalid-argument', 'Az igazolás feltöltési útvonala érvénytelen.');
  }

  const profileRef = db.doc(`users/${request.auth.uid}`);
  const profile = await profileRef.get();
  if (!profile.exists) {
    throw new HttpsError('not-found', 'A felhasználói profil nem található.');
  }

  const bucket = getStorage().bucket();
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    throw new HttpsError('not-found', 'A feltöltött igazoláskép nem található.');
  }
  const [metadata] = await file.getMetadata();
  const imageSize = Number(metadata.size);
  if (metadata.contentType !== 'image/jpeg' || !Number.isFinite(imageSize) || imageSize > 700000) {
    throw new HttpsError('invalid-argument', 'Az igazoláskép formátuma vagy mérete érvénytelen.');
  }

  const downloadToken = randomUUID();
  await file.setMetadata({
    metadata: { firebaseStorageDownloadTokens: downloadToken },
  });
  const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
  await profileRef.update({
    [`eventVerifications.${eventType}`]: {
      imageUrl,
      status: 'pending',
      uploadedAt: FieldValue.serverTimestamp(),
    },
  });
  return { imageUrl };
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
  registerFebrutalisTeam: onCall(registerFebrutalisTeamHandler),
  joinFebrutalisTeam: onCall(joinFebrutalisTeamHandler),
  publishNotification: onCall(publishNotificationHandler),
  listFebrutalisRegistrations: onCall(listFebrutalisRegistrationsHandler),
  submitStudentVerification: onCall(submitStudentVerificationHandler),
  deleteEventDayHandler,
  deleteEventEditionHandler,
  registerFebrutalisTeamHandler,
  joinFebrutalisTeamHandler,
  assignFebrutalisTeamCaptainHandler,
  publishNotificationHandler,
  listFebrutalisRegistrationsHandler,
  submitStudentVerificationHandler,
};
