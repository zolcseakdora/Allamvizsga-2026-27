import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const projectId = 'demo-mmdsz-rules-tests';
const firestoreHost = '127.0.0.1';
const firestorePort = 8091;
const sampleSponsor = { name: 'Sample sponsor', logo: 'data:image/jpeg;base64,AA==', team: 'Alfa' };
let testEnv;

const profiles = {
  'captain-alfa': { role: 'Csapatkapitány', team: 'Alfa', isVerified: true },
  'deputy-alfa': { role: 'Alcsapatkapitány', team: 'Alfa', isVerified: true },
  'captain-beta': { role: 'Csapatkapitány', team: 'Beta', isVerified: true },
  admin: { role: 'Főszervező', team: '', isVerified: false },
  organizer: { role: 'Szervező', team: '', isVerified: true },
  jury: { role: 'Zsűri', team: '', isVerified: true },
  member: { role: 'Csapattag', team: 'Alfa', isVerified: true },
  unapproved: { role: 'Csapatkapitány', team: 'Alfa', isVerified: false },
  disabled: { role: 'Csapatkapitány', team: 'Alfa', isVerified: true, isDisabled: true },
  'disabled-status': { role: 'Csapatkapitány', team: 'Alfa', isVerified: true, accountStatus: 'disabled' },
  'pending-status': {
    role: 'Csapatkapitány',
    team: 'Alfa',
    isVerified: true,
    accountStatus: 'pending_captain_approval',
  },
};

function userContext(uid) {
  return testEnv.authenticatedContext(uid, {
    email: `${uid}@example.test`,
    email_verified: true,
  }).firestore();
}

async function seedFixtures() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await Promise.all([
      setDoc(doc(firestore, 'teams/Alfa'), { name: 'Alfa' }),
      setDoc(doc(firestore, 'teams/Beta'), { name: 'Beta' }),
      ...Object.entries(profiles).map(([uid, profile]) => (
        setDoc(doc(firestore, `users/${uid}`), {
          name: uid,
          email: `${uid}@example.test`,
          ...profile,
        })
      )),
      setDoc(doc(firestore, 'sponsors/alfa-sponsor'), sampleSponsor),
      setDoc(doc(firestore, 'sponsors/beta-sponsor'), { ...sampleSponsor, team: 'Beta' }),
    ]);
  });
}

async function assertSponsorWritesDenied(uid) {
  const firestore = userContext(uid);
  await assertFails(setDoc(doc(firestore, 'sponsors/new-sponsor'), sampleSponsor));
  await assertFails(updateDoc(doc(firestore, 'sponsors/alfa-sponsor'), { name: 'Changed' }));
  await assertFails(deleteDoc(doc(firestore, 'sponsors/alfa-sponsor')));
}

before(async () => {
  const rules = await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { host: firestoreHost, port: firestorePort, rules },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedFixtures();
});

after(async () => {
  await testEnv?.cleanup();
});

describe('Firestore sponsor Security Rules', () => {
  it('allows the approved captain to add, update, and delete a sponsor in their team', async () => {
    const firestore = userContext('captain-alfa');
    const newSponsor = doc(firestore, 'sponsors/captain-added');

    await assertSucceeds(setDoc(newSponsor, sampleSponsor));
    await assertSucceeds(updateDoc(newSponsor, { name: 'Updated by captain' }));
    await assertSucceeds(deleteDoc(newSponsor));
  });

  it('allows the approved deputy captain to add, update, and delete a sponsor in their team', async () => {
    const firestore = userContext('deputy-alfa');
    const newSponsor = doc(firestore, 'sponsors/deputy-added');

    await assertSucceeds(setDoc(newSponsor, sampleSponsor));
    await assertSucceeds(updateDoc(newSponsor, { name: 'Updated by deputy' }));
    await assertSucceeds(deleteDoc(newSponsor));
  });

  it('denies every sponsor write by a captain of another team', async () => {
    await assertSponsorWritesDenied('captain-beta');
  });

  it('denies every sponsor write by the head organizer', async () => {
    await assertSponsorWritesDenied('admin');
  });

  it('denies every sponsor write by an organizer', async () => {
    await assertSponsorWritesDenied('organizer');
  });

  it('denies every sponsor write by a jury member', async () => {
    await assertSponsorWritesDenied('jury');
  });

  it('denies every sponsor write by a team member', async () => {
    await assertSponsorWritesDenied('member');
  });

  it('denies every sponsor write by an unapproved captain', async () => {
    await assertSponsorWritesDenied('unapproved');
  });

  it('denies every sponsor write by a disabled account', async () => {
    await assertSponsorWritesDenied('disabled');
  });

  it('denies every sponsor write by an account disabled through accountStatus', async () => {
    await assertSponsorWritesDenied('disabled-status');
  });

  it('does not let legacy verification override a new pending account status', async () => {
    await assertSponsorWritesDenied('pending-status');
    await assertFails(getDoc(doc(userContext('pending-status'), 'sponsors/alfa-sponsor')));
  });

  it('denies changing the team of an existing sponsor', async () => {
    const firestore = userContext('captain-alfa');
    await assertFails(updateDoc(doc(firestore, 'sponsors/alfa-sponsor'), { team: 'Beta' }));
  });

  it('denies changing a user profile role or team to gain sponsor permissions', async () => {
    const firestore = userContext('member');
    await assertFails(updateDoc(doc(firestore, 'users/member'), { role: 'Csapatkapitány' }));
    await assertFails(updateDoc(doc(firestore, 'users/member'), { team: 'Beta' }));
  });

  it('denies a head organizer from changing their own role to captain', async () => {
    const firestore = userContext('admin');
    await assertFails(updateDoc(doc(firestore, 'users/admin'), { role: 'Csapatkapitány' }));
  });

  it('denies users from setting their own disabled or approval status', async () => {
    const firestore = userContext('member');
    await assertFails(updateDoc(doc(firestore, 'users/member'), { isDisabled: true }));
    await assertFails(updateDoc(doc(firestore, 'users/member'), { accountStatus: 'active' }));
    await assertFails(updateDoc(doc(firestore, 'users/member'), { membershipStatus: 'active' }));
  });

  it('denies client-side profile creation', async () => {
    const firestore = userContext('new-user');
    await assertFails(setDoc(doc(firestore, 'users/new-user'), {
      name: 'New user',
      email: 'new-user@example.test',
      team: 'Alfa',
      role: 'Csapatkapitány',
      isVerified: true,
    }));
  });

  it('allows approved users to read sponsors', async () => {
    await assertSucceeds(getDoc(doc(userContext('member'), 'sponsors/alfa-sponsor')));
  });

  it('denies sponsor reads to unapproved users', async () => {
    await assertFails(getDoc(doc(userContext('unapproved'), 'sponsors/alfa-sponsor')));
  });
});
