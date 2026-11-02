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
const { deleteDoc, doc, setDoc, updateDoc } = require('firebase/firestore');

const projectId = 'demo-event-admin-validation';
const rules = fs.readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8');
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
  });
});

test.beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/admin'), { role: 'Főszervező', isVerified: true });
    await setDoc(doc(context.firestore(), 'users/member'), { role: 'Csapattag', isVerified: true });
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
