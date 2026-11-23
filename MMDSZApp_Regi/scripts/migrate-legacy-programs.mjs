import process from 'node:process';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const [eventId = 'diaknapok-2027'] = process.argv.slice(2);
const app = initializeApp({ credential: applicationDefault() });
const db = getFirestore(app);
const eventRef = db.collection('events').doc(eventId);
const eventSnapshot = await eventRef.get();

if (
  !eventSnapshot.exists
  || eventSnapshot.data().type !== 'diaknapok'
  || eventSnapshot.data().editionYear !== 2027
) {
  throw new Error(`${eventId} must be imported as the Diáknapok 2027 edition before migration.`);
}

const daysSnapshot = await eventRef.collection('days').get();
const dayIdByWeekday = new Map(daysSnapshot.docs.map((day) => [day.data().weekday, day.id]));
const legacyPrograms = await db.collection('programs').get();
const migrated = [];

for (const programDocument of legacyPrograms.docs) {
  const program = programDocument.data();
  const dayId = dayIdByWeekday.get(program.day);
  if (!dayId) {
    throw new Error(`Legacy program "${programDocument.id}" has an unsupported or missing day.`);
  }
  if (typeof program.title !== 'string' || typeof program.time !== 'string') {
    throw new Error(`Legacy program "${programDocument.id}" is missing its title or time.`);
  }

  migrated.push({
    ref: eventRef.collection('days').doc(dayId).collection('programItems').doc(programDocument.id),
    data: {
      title: program.title,
      startsAt: program.time,
      ...(typeof program.helyszín === 'string' ? { location: program.helyszín } : {}),
      ...(typeof program.description === 'string' ? { description: program.description } : {}),
      ...(typeof program.thumb === 'string' ? { thumbnailUrl: program.thumb } : {}),
      legacyImageId: programDocument.id,
      migratedFromLegacy: true,
    },
  });
}

for (let offset = 0; offset < migrated.length; offset += 450) {
  const batch = db.batch();
  migrated.slice(offset, offset + 450).forEach(({ ref, data }) => batch.set(ref, data, { merge: true }));
  await batch.commit();
}

console.log(`Copied ${migrated.length} legacy programs to ${eventId}; original documents were preserved.`);
