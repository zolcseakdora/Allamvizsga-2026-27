const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore: getAdminFirestore } = require('firebase-admin/firestore');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} = require('firebase/firestore');
const { ref, uploadBytes } = require('firebase/storage');

const projectId = 'demo-event-admin-validation';
const rules = fs.readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8');
const storageRules = fs.readFileSync(path.resolve(__dirname, '../../../storage.rules'), 'utf8');
const adminApp = getApps().find((app) => app.name === 'event-admin-tests')
  ?? initializeApp({ projectId }, 'event-admin-tests');
const adminDb = getAdminFirestore(adminApp);
const eventAdmin = require('../event-admin');
let environment;

const validEdition = {
  type: 'februtalis',
  editionYear: 2027,
  title: 'Februtális 2027',
  startDate: '2027-02-26',
  endDate: '2027-02-27',
  published: true,
  theme: {
    primary: '#EC2127',
    background: '#121212',
    surface: '#1E1E1E',
    border: '#333333',
    activeSurface: '#321719',
  },
};

const validDay = {
  date: '2027-02-26',
  weekday: 'Péntek',
  order: 0,
  eventType: 'februtalis',
  editionYear: 2027,
};

const validProgram = {
  title: 'Nyitóprogram',
  startsAt: '19:30',
  location: 'Főtér',
  description: '',
  type: 'other',
  status: 'scheduled',
  dayId: 'friday',
  eventType: 'februtalis',
  editionYear: 2027,
};

test.before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
    storage: { rules: storageRules },
  });
});

test.beforeEach(async () => {
  await environment.clearFirestore();
  await environment.clearStorage();
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/admin'), { role: 'Főszervező', isVerified: true });
    await setDoc(doc(context.firestore(), 'users/member'), { role: 'Csapattag', isVerified: true });
    await setDoc(doc(context.firestore(), 'users/februtalis-organizer'), {
      role: 'Csapattag',
      isVerified: true,
      eventMemberships: { februtalis: { role: 'Szervező' } },
    });
    await setDoc(doc(context.firestore(), 'users/jury'), {
      role: 'Csapattag',
      isVerified: true,
      eventMemberships: { februtalis: { role: 'Zsűri' } },
    });
  });
});

test.after(async () => {
  await environment.cleanup();
  await adminApp.delete();
});

test('event creation and updates validate data and require head-organizer permissions', async () => {
  const admin = environment.authenticatedContext('admin').firestore();
  const member = environment.authenticatedContext('member').firestore();
  const eventRef = doc(admin, 'events/februtalis-2027');

  await assertSucceeds(setDoc(eventRef, validEdition));
  await assertFails(setDoc(doc(member, 'events/unauthorized'), validEdition));
  await assertFails(setDoc(doc(admin, 'events/invalid-date'), {
    ...validEdition,
    startDate: '2027-02-31',
  }));
  await assertFails(setDoc(doc(admin, 'events/non-leap-day'), {
    ...validEdition,
    startDate: '2027-02-29',
    endDate: '2027-03-01',
  }));
  await assertSucceeds(setDoc(doc(admin, 'events/leap-day'), {
    ...validEdition,
    startDate: '2028-02-29',
    endDate: '2028-03-01',
  }));
  await assertFails(setDoc(doc(admin, 'events/invalid-type'), {
    ...validEdition,
    type: 'unknown',
  }));

  await assertSucceeds(updateDoc(eventRef, { title: 'Februtális 2027 frissítve' }));
  await assertFails(updateDoc(eventRef, { endDate: '2027-02-25' }));
  await assertFails(updateDoc(doc(member, 'events/februtalis-2027'), {
    title: 'Nem admin módosítás',
  }));
});

test('event, day and program deletion permissions are enforced', async () => {
  const admin = environment.authenticatedContext('admin').firestore();
  const member = environment.authenticatedContext('member').firestore();
  const eventRef = doc(admin, 'events/februtalis-2027');
  const dayRef = doc(admin, 'events/februtalis-2027/days/friday');

  await assertSucceeds(setDoc(eventRef, validEdition));
  await assertSucceeds(setDoc(dayRef, validDay));
  await adminDb.doc('events/februtalis-2027/teams/team-a').set({
    name: 'Team A',
    kind: 'team',
    active: true,
  });
  await adminDb.doc('events/februtalis-2027/days/friday/programItems/opening').set(validProgram);
  await assertFails(deleteDoc(eventRef));
  await assertFails(deleteDoc(doc(member, 'events/februtalis-2027')));
  await assertFails(deleteDoc(dayRef));

  await assertFails(eventAdmin.deleteEventDayHandler({
    auth: { uid: 'member' },
    data: { eventId: 'februtalis-2027', dayId: 'friday' },
  }));
  await assert.rejects(
    eventAdmin.deleteEventDayHandler({
      data: { eventId: 'februtalis-2027', dayId: 'friday' },
    }),
    { code: 'unauthenticated' },
  );
  await assert.rejects(
    eventAdmin.deleteEventDayHandler({
      auth: { uid: 'admin' },
      data: { eventId: 'februtalis-2027', dayId: 'friday' },
    }),
    { code: 'failed-precondition' },
  );
  await assert.rejects(
    eventAdmin.deleteEventEditionHandler({
      auth: { uid: 'admin' },
      data: { eventId: 'februtalis-2027' },
    }),
    { code: 'failed-precondition' },
  );
});

test('event days and program items validate fields, and callable deletion succeeds when empty', async () => {
  const admin = environment.authenticatedContext('admin').firestore();
  const member = environment.authenticatedContext('member').firestore();
  const eventRef = doc(admin, 'events/februtalis-2027');
  const dayRef = doc(admin, 'events/februtalis-2027/days/friday');
  const programRef = doc(admin, 'events/februtalis-2027/days/friday/programItems/opening');

  await assertSucceeds(setDoc(eventRef, validEdition));
  await assertSucceeds(setDoc(dayRef, validDay));
  const outOfRangeDay = doc(admin, 'events/februtalis-2027/days/2027-02-21');
  await assertSucceeds(setDoc(outOfRangeDay, {
    date: '2027-02-21',
    weekday: 'Vasárnap',
    order: 2,
    eventType: 'februtalis',
    editionYear: 2027,
    programDayOnly: true,
  }));
  await assertFails(setDoc(doc(admin, 'events/februtalis-2027/days/out-of-range-without-marker'), {
    date: '2027-02-21',
    weekday: 'Vasárnap',
    order: 2,
    eventType: 'februtalis',
    editionYear: 2027,
  }));
  await assertFails(setDoc(doc(admin, 'events/februtalis-2027/days/invalid-marker'), {
    date: '2027-02-21',
    weekday: 'Vasárnap',
    order: 2,
    eventType: 'februtalis',
    editionYear: 2027,
    programDayOnly: 'true',
  }));
  const unchangedEdition = await getDoc(eventRef);
  assert.equal(unchangedEdition.data().startDate, validEdition.startDate);
  assert.equal(unchangedEdition.data().endDate, validEdition.endDate);
  await assertSucceeds(updateDoc(dayRef, { weekday: 'Szombat' }));
  await assertFails(updateDoc(dayRef, { eventType: 'diaknapok' }));
  await assertFails(setDoc(doc(admin, 'events/februtalis-2027/days/invalid'), {
    ...validDay,
    date: '2027-03-01',
  }));
  await assertFails(setDoc(doc(member, 'events/februtalis-2027/days/member'), validDay));
  await assertSucceeds(setDoc(programRef, validProgram));
  await assertSucceeds(updateDoc(programRef, { title: 'Frissített nyitóprogram' }));
  await assertFails(updateDoc(programRef, { status: 'unknown' }));
  await assertFails(setDoc(
    doc(member, 'events/februtalis-2027/days/friday/programItems/unauthorized'),
    validProgram,
  ));
  await assertFails(setDoc(doc(admin, 'events/februtalis-2027/days/friday/programItems/invalid'), {
    ...validProgram,
    startsAt: '25:90',
  }));

  await assertSucceeds(deleteDoc(programRef));
  await assertFails(deleteDoc(doc(member, 'events/februtalis-2027/days/friday/programItems/invalid')));
  await eventAdmin.deleteEventDayHandler({
    auth: { uid: 'admin' },
    data: { eventId: 'februtalis-2027', dayId: 'friday' },
  });
  await assertSucceeds(setDoc(eventRef, validEdition));
  await eventAdmin.deleteEventEditionHandler({
    auth: { uid: 'admin' },
    data: { eventId: 'februtalis-2027' },
  });

  const savedEdition = await adminDb.doc('events/februtalis-2027').get();
  assert.equal(savedEdition.exists, false);
  const savedDay = await adminDb.doc('events/februtalis-2027/days/friday').get();
  assert.equal(savedDay.exists, false);
});

test('Februtális event registrations are private to the owner and listed by admins only', async () => {
  const member = environment.authenticatedContext('member').firestore();
  const admin = environment.authenticatedContext('admin').firestore();
  const organizer = environment.authenticatedContext('februtalis-organizer').firestore();
  const jury = environment.authenticatedContext('jury').firestore();
  const registration = {
    uid: 'member',
    eventType: 'februtalis',
    teamName: 'Fény Csapat',
    teamKey: 'fény csapat',
    createdAt: serverTimestamp(),
  };

  await assertSucceeds(setDoc(
    doc(member, 'event_registrations/member_februtalis'),
    registration,
  ));
  await assertSucceeds(getDoc(doc(member, 'event_registrations/member_februtalis')));
  await assertFails(setDoc(
    doc(member, 'event_registrations/other_februtalis'),
    { ...registration, uid: 'other' },
  ));
  await assertFails(setDoc(
    doc(member, 'event_registrations/member_diaknapok'),
    { ...registration, eventType: 'diaknapok' },
  ));
  await assertFails(setDoc(
    doc(member, 'event_registrations/member-malformed'),
    { ...registration, extra: true },
  ));
  await assertFails(setDoc(
    doc(organizer, 'event_registrations/februtalis-organizer_februtalis'),
    { ...registration, uid: 'februtalis-organizer', createdAt: serverTimestamp() },
  ));
  await assertFails(setDoc(
    doc(jury, 'event_registrations/jury_februtalis'),
    { ...registration, uid: 'jury', createdAt: serverTimestamp() },
  ));
  await assertFails(getDocs(query(
    collection(member, 'event_registrations'),
    where('eventType', '==', 'februtalis'),
  )));
  const adminRegistrations = await getDocs(query(
    collection(admin, 'event_registrations'),
    where('eventType', '==', 'februtalis'),
  ));
  assert.equal(adminRegistrations.size, 1);
  const callableRegistrations = await eventAdmin.listFebrutalisRegistrationsHandler({
    auth: { uid: 'admin' },
  });
  assert.deepEqual(callableRegistrations.registrations, [{
    uid: 'member',
    teamName: 'Fény Csapat',
    teamKey: 'fény csapat',
  }]);
  await assert.rejects(
    eventAdmin.listFebrutalisRegistrationsHandler({ auth: { uid: 'member' } }),
    { code: 'permission-denied' },
  );
  await assertFails(setDoc(doc(member, 'teams/member-created-februtalis-team'), {
    name: 'Fény Csapat',
    nameKey: 'fény csapat',
    eventType: 'februtalis',
    captainUid: 'member',
  }));
});

test('Februtális registration list callable returns an empty list for head organizers', async () => {
  const result = await eventAdmin.listFebrutalisRegistrationsHandler({
    auth: { uid: 'admin' },
  });
  assert.deepEqual(result, { registrations: [] });
});

test('client cannot create its own profile; profiles are created only by the backend', async () => {
  // A kiadási ág biztonsági modellje: felhasználói profilt csak a Cloud Functions hozhat létre
  // (requestCaptainRegistration / prepareInvitedRegistration), így a kliens nem adhat magának szerepkört.
  const newcomer = environment.authenticatedContext('newcomer').firestore();
  const batch = writeBatch(newcomer);
  batch.set(doc(newcomer, 'users/newcomer'), {
    name: 'Új Résztvevő',
    email: 'newcomer@example.com',
    team: 'Egyéni',
    role: 'Csapattag',
    createdAt: new Date(),
    isVerified: false,
  });
  batch.set(doc(newcomer, 'event_registrations/newcomer_februtalis'), {
    uid: 'newcomer',
    eventType: 'februtalis',
    teamName: 'Fény Csapat',
    teamKey: 'fény csapat',
    createdAt: serverTimestamp(),
  });
  await assertFails(batch.commit());
});

test('only head organizers create Februtális teams and assign their approved registrants', async () => {
  await adminDb.doc('users/member-2').set({
    role: 'Csapattag',
    isVerified: true,
    team: 'Egyéni',
  });
  await adminDb.doc('event_registrations/member_februtalis').set({
    uid: 'member',
    eventType: 'februtalis',
    teamName: 'Fény Csapat',
    teamKey: 'fény csapat',
  });
  await adminDb.doc('event_registrations/member-2_februtalis').set({
    uid: 'member-2',
    eventType: 'februtalis',
    teamName: 'Fény Csapat',
    teamKey: 'fény csapat',
  });

  const result = await eventAdmin.assignFebrutalisTeamCaptainHandler({
    auth: { uid: 'admin' },
    data: { teamKey: 'fény csapat', captainUid: 'member' },
  });
  const team = await adminDb.doc(`teams/${result.teamId}`).get();
  const captain = await adminDb.doc('users/member').get();
  const member = await adminDb.doc('users/member-2').get();
  assert.equal(team.data().eventType, 'februtalis');
  assert.equal(team.data().name, 'Fény Csapat');
  assert.equal(team.data().captainUid, 'member');
  assert.deepEqual(captain.data().eventMemberships.februtalis, {
    teamId: result.teamId,
    role: 'Csapatkapitány',
  });
  assert.deepEqual(member.data().eventMemberships.februtalis, {
    teamId: result.teamId,
    role: 'Csapattag',
  });
  assert.equal(captain.data().team, undefined);

  await assert.rejects(
    eventAdmin.assignFebrutalisTeamCaptainHandler({
      auth: { uid: 'member' },
      data: { teamKey: 'fény csapat', captainUid: 'member' },
    }),
    { code: 'permission-denied' },
  );
  await assert.rejects(
    eventAdmin.registerFebrutalisTeamHandler({
      auth: { uid: 'member' },
      data: { teamKey: 'másik csapat', captainUid: 'member' },
    }),
    { code: 'permission-denied' },
  );
  await assert.rejects(
    eventAdmin.joinFebrutalisTeamHandler({
      auth: { uid: 'member' },
      data: { teamId: result.teamId },
    }),
    { code: 'failed-precondition' },
  );
});

test('invitations and event roles cannot be written from the client', async () => {
  // Meghívót csak a createInvite, beváltást csak a redeemInvite / reviewPendingMembership
  // callable végezhet (lásd tests/invite-security.test.cjs és tests/registration-functions.test.cjs).
  const admin = environment.authenticatedContext('admin').firestore();
  const member = environment.authenticatedContext('member').firestore();
  const juryInvite = {
    email: 'jury@example.com',
    eventType: 'februtalis',
    role: 'Zsűri',
    status: 'Függőben',
  };
  await assertFails(setDoc(doc(admin, 'invites/jury@example.com'), juryInvite));
  await assertFails(setDoc(doc(member, 'invites/unauthorized@example.com'), {
    ...juryInvite,
    email: 'unauthorized@example.com',
  }));

  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/jury'), {
      role: 'Csapattag',
      team: 'Egyéni',
      email: 'jury@example.com',
      isVerified: true,
    });
    await setDoc(doc(context.firestore(), 'invites/jury@example.com'), juryInvite);
  });
  const invitedUser = environment.authenticatedContext('jury', {
    email: 'jury@example.com',
    email_verified: true,
  }).firestore();
  // A felhasználó nem adhat magának FebruTális-szerepkört, és nem fogadhatja el maga a meghívót.
  await assertFails(updateDoc(doc(invitedUser, 'users/jury'), {
    'eventMemberships.februtalis': { role: 'Zsűri' },
  }));
  await assertFails(updateDoc(doc(invitedUser, 'invites/jury@example.com'), {
    status: 'Elfogadva',
  }));
  await assertSucceeds(getDoc(doc(invitedUser, 'invites/jury@example.com')));
});

test('Februtális organizers can edit only Februtális programs; jury remains read-only', async () => {
  const admin = environment.authenticatedContext('admin').firestore();
  const februtalisOrganizer = environment.authenticatedContext('februtalis-organizer').firestore();
  const jury = environment.authenticatedContext('jury').firestore();
  const februtalisEvent = doc(admin, 'events/februtalis-2027');
  const februtalisOrganizerEvent = doc(februtalisOrganizer, 'events/februtalis-2027');
  const diaknapokEvent = doc(admin, 'events/diaknapok-2027');

  await assertSucceeds(setDoc(februtalisEvent, validEdition));
  await assertSucceeds(setDoc(diaknapokEvent, { ...validEdition, type: 'diaknapok' }));
  await assertFails(updateDoc(februtalisOrganizerEvent, { title: 'Szervező nem módosíthat címet' }));
  await assertSucceeds(setDoc(
    doc(februtalisOrganizer, 'events/februtalis-2027/days/friday'),
    validDay,
  ));
  await assertFails(setDoc(
    doc(februtalisOrganizer, 'events/diaknapok-2027/days/wednesday'),
    { ...validDay, eventType: 'diaknapok', weekday: 'Szerda' },
  ));
  await assertFails(setDoc(
    doc(februtalisOrganizer, 'events/februtalis-2027/days/sunday'),
    { ...validDay, date: '2027-02-28', weekday: 'Vasárnap', order: 2 },
  ));
  const rangeExpansion = writeBatch(februtalisOrganizer);
  rangeExpansion.update(februtalisOrganizerEvent, { endDate: '2027-02-28' });
  rangeExpansion.set(
    doc(februtalisOrganizer, 'events/februtalis-2027/days/sunday'),
    { date: '2027-02-28', weekday: 'Vasárnap', order: 2, eventType: 'februtalis', editionYear: 2027 },
  );
  await assertSucceeds(rangeExpansion.commit());
  await assertFails(setDoc(
    doc(jury, 'events/februtalis-2027/days/friday/programItems/unauthorized'),
    validProgram,
  ));
  // Csapatot csak a backend hoz létre (registerFebrutalisTeam); a szervező a meglévőt szerkesztheti.
  await assertFails(setDoc(doc(februtalisOrganizer, 'teams/februtalis-team'), {
    name: 'Februtális csapat',
    eventType: 'februtalis',
  }));
  await adminDb.doc('teams/februtalis-team').set({ name: 'Februtális csapat', eventType: 'februtalis' });
  await assertSucceeds(updateDoc(doc(februtalisOrganizer, 'teams/februtalis-team'), {
    name: 'Februtális csapat (frissítve)',
    eventType: 'februtalis',
  }));
  await assertFails(setDoc(doc(februtalisOrganizer, 'teams/diaknapok-team'), {
    name: 'Diáknapos csapat',
    eventType: 'diaknapok',
  }));
  await assertFails(updateDoc(doc(februtalisOrganizer, 'events/diaknapok-2027'), {
    title: 'Ne módosíthatja',
  }));
});

test('notification publication is callable-only and validates the organizer, event, and audience', async () => {
  const admin = environment.authenticatedContext('admin').firestore();
  const member = environment.authenticatedContext('member').firestore();
  const notificationId = 'notification00000001';
  const result = await eventAdmin.publishNotificationHandler({
    auth: { uid: 'admin' },
    data: {
      notificationId,
      title: '  Fontos információ  ',
      body: '  Találkozó 18:00-kor.  ',
      eventType: 'februtalis',
      audience: 'captains',
    },
  });
  assert.deepEqual(result, { notificationId });

  const stored = await adminDb.doc(`notifications/${notificationId}`).get();
  assert.equal(stored.data().title, 'Fontos információ');
  assert.equal(stored.data().body, 'Találkozó 18:00-kor.');
  assert.equal(stored.data().eventType, 'februtalis');
  assert.equal(stored.data().audience, 'captains');
  assert.equal(stored.data().createdBy, 'admin');

  await assert.rejects(
    eventAdmin.publishNotificationHandler({
      auth: { uid: 'member' },
      data: {
        notificationId: 'notification00000002',
        title: 'Nem engedélyezett',
        body: 'Szöveg',
        eventType: 'diaknapok',
        audience: 'everyone',
      },
    }),
    { code: 'permission-denied' },
  );
  await assert.rejects(
    eventAdmin.publishNotificationHandler({
      auth: { uid: 'admin' },
      data: {
        notificationId: 'notification00000003',
        title: 'Hibás célcsoport',
        body: 'Szöveg',
        eventType: 'februtalis',
        audience: 'arbitrary-user',
      },
    }),
    { code: 'invalid-argument' },
  );
  await assertFails(setDoc(doc(admin, 'notifications/direct-write'), {
    title: 'Közvetlen kliensírás',
    body: 'Ezt a szabály letiltja.',
    eventType: 'diaknapok',
    audience: 'everyone',
  }));
  await assertFails(setDoc(doc(member, 'notifications/member-write'), {
    title: 'Közvetlen kliensírás',
    body: 'Ezt a szabály letiltja.',
    eventType: 'diaknapok',
    audience: 'everyone',
  }));
});

test('verification uploads require owner-scoped JPEGs and are saved with event metadata', async () => {
  const memberStorage = environment.authenticatedContext('member')
    .storage(`gs://${projectId}.appspot.com`);
  const storagePath = 'student-verifications/member/februtalis/verification-001.jpg';
  const image = new Blob(['verification image'], { type: 'image/jpeg' });
  await assertSucceeds(uploadBytes(ref(memberStorage, storagePath), image));
  await assertFails(uploadBytes(
    ref(environment.authenticatedContext('jury').storage(`gs://${projectId}.appspot.com`), storagePath),
    image,
  ));
  await assertFails(uploadBytes(
    ref(memberStorage, 'student-verifications/member/februtalis/invalid.png'),
    image,
  ));
  await assertFails(uploadBytes(
    ref(memberStorage, 'student-verifications/other/februtalis/verification-002.jpg'),
    image,
  ));
  await assertFails(updateDoc(doc(
    environment.authenticatedContext('member').firestore(),
    'users/member',
  ), {
    'eventVerifications.februtalis': { imageUrl: 'https://example.com/image.jpg', status: 'pending' },
  }));

  const result = await eventAdmin.submitStudentVerificationHandler({
    auth: { uid: 'member' },
    data: { eventType: 'februtalis', storagePath },
  });
  const profile = await adminDb.doc('users/member').get();
  assert.match(result.imageUrl, /^https:\/\/firebasestorage\.googleapis\.com\//);
  assert.equal(profile.data().eventVerifications.februtalis.imageUrl, result.imageUrl);
  assert.equal(profile.data().eventVerifications.februtalis.status, 'pending');
  assert.equal(profile.data().isVerified, true);

  await assert.rejects(
    eventAdmin.submitStudentVerificationHandler({
      auth: { uid: 'member' },
      data: { eventType: 'diaknapok', storagePath },
    }),
    (error) => error.code === 'invalid-argument',
  );
  await assert.rejects(
    eventAdmin.submitStudentVerificationHandler({
      data: { eventType: 'februtalis', storagePath },
    }),
    (error) => error.code === 'unauthenticated',
  );
});
