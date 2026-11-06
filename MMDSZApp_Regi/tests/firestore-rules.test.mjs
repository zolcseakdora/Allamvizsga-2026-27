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
  writeBatch,
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

describe('Galéria jogosultságok', () => {
  const thumbnail = 'data:image/jpeg;base64,AA==';
  const fullImage = 'data:image/jpeg;base64,AAAABBBB';

  function galleryMetadata(uid, name = uid) {
    return {
      thumb: thumbnail,
      category: 'Sportok',
      uploadedBy: name,
      uploadedByUid: uid,
      createdAt: new Date(),
    };
  }

  async function uploadPhoto(uid, imageId) {
    const firestore = userContext(uid);
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, 'gallery', imageId), galleryMetadata(uid));
    batch.set(doc(firestore, 'gallery_images', imageId), {
      image: fullImage,
      uploadedByUid: uid,
    });
    await assertSucceeds(batch.commit());
  }

  it('jóváhagyott csapattag feltölthet és törölhet saját képet', async () => {
    await uploadPhoto('member', 'own-photo');
    const firestore = userContext('member');
    await assertSucceeds(getDoc(doc(firestore, 'gallery/own-photo')));
    await assertSucceeds(getDoc(doc(firestore, 'gallery_images/own-photo')));

    const batch = writeBatch(firestore);
    batch.delete(doc(firestore, 'gallery/own-photo'));
    batch.delete(doc(firestore, 'gallery_images/own-photo'));
    await assertSucceeds(batch.commit());
  });

  it('jóváhagyott szervező is feltölthet képet', async () => {
    await uploadPhoto('organizer', 'organizer-photo');
  });

  it('más felhasználó nem törölheti és nem módosíthatja a képet vagy a teljes képet', async () => {
    await uploadPhoto('member', 'member-photo');
    const other = userContext('organizer');
    await assertFails(deleteDoc(doc(other, 'gallery/member-photo')));
    await assertFails(deleteDoc(doc(other, 'gallery_images/member-photo')));
    await assertFails(updateDoc(doc(other, 'gallery/member-photo'), { uploadedByUid: 'organizer' }));
    await assertFails(updateDoc(doc(other, 'gallery_images/member-photo'), { uploadedByUid: 'organizer' }));
  });

  it('a feltöltő nem hamisíthatja meg a tulajdonos Firebase UID-jét', async () => {
    const firestore = userContext('member');
    await assertFails(setDoc(doc(firestore, 'gallery/forged-photo'), galleryMetadata('organizer', 'member')));

    const batch = writeBatch(firestore);
    batch.set(doc(firestore, 'gallery/forged-batch'), galleryMetadata('member'));
    batch.set(doc(firestore, 'gallery_images/forged-batch'), {
      image: fullImage,
      uploadedByUid: 'organizer',
    });
    await assertFails(batch.commit());
  });

  it('nem lehet önálló teljes képet létrehozni megfelelő galéria-bejegyzés nélkül', async () => {
    const firestore = userContext('member');
    await assertFails(setDoc(doc(firestore, 'gallery_images/orphan'), {
      image: fullImage,
      uploadedByUid: 'member',
    }));
  });

  it('nem jóváhagyott és letiltott felhasználó nem tölthet fel vagy törölhet', async () => {
    await uploadPhoto('member', 'protected-photo');
    for (const uid of ['unapproved', 'disabled', 'pending-status']) {
      const firestore = userContext(uid);
      await assertFails(setDoc(doc(firestore, 'gallery/' + uid), galleryMetadata(uid)));
      await assertFails(getDoc(doc(firestore, 'gallery/protected-photo')));
      await assertFails(deleteDoc(doc(firestore, 'gallery/protected-photo')));
      await assertFails(deleteDoc(doc(firestore, 'gallery_images/protected-photo')));
    }
  });

  it('a főszervező más képeit, valamint a régi UID nélküli képeket is törölheti', async () => {
    await uploadPhoto('member', 'another-photo');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await setDoc(doc(firestore, 'gallery/legacy-photo'), {
        thumb: thumbnail,
        category: 'Sportok',
        uploadedBy: 'Régi felhasználó',
        createdAt: new Date(),
      });
      await setDoc(doc(firestore, 'gallery_images/legacy-photo'), { image: fullImage });
    });
    const owner = userContext('member');
    await assertFails(deleteDoc(doc(owner, 'gallery/legacy-photo')));
    await assertFails(deleteDoc(doc(owner, 'gallery_images/legacy-photo')));
    const firestore = userContext('admin');
    for (const imageId of ['another-photo', 'legacy-photo']) {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, 'gallery', imageId));
      batch.delete(doc(firestore, 'gallery_images', imageId));
      await assertSucceeds(batch.commit());
    }
  });
});
