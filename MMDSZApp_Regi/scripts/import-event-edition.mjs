import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [inputFile] = args.filter((argument) => argument !== '--dry-run');

if (!inputFile) {
  throw new Error('Usage: npm run events:import -- path/to/edition.json');
}

const event = JSON.parse(await readFile(path.resolve(inputFile), 'utf8'));
const validDate = (value) => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

if (
  typeof event.id !== 'string'
  || !/^[a-z0-9-]+$/.test(event.id)
  || !['februtalis', 'diaknapok'].includes(event.type)
  || !Number.isInteger(event.editionYear)
  || typeof event.title !== 'string'
  || !validDate(event.startDate)
  || !validDate(event.endDate)
  || event.startDate > event.endDate
  || event.timeZone !== 'Europe/Bucharest'
  || event.published !== true
  || !Array.isArray(event.days)
) {
  throw new Error('Edition metadata is invalid or unpublished.');
}

if (event.days.length === 0) {
  throw new Error('An event edition must contain at least one program day.');
}

const seenDates = new Set();
const weekdayFormatter = new Intl.DateTimeFormat('hu-HU', {
  timeZone: event.timeZone,
  weekday: 'long',
});

for (const [index, day] of event.days.entries()) {
  if (
    !validDate(day.date)
    || (index > 0 && day.date <= event.days[index - 1].date)
    || day.id !== day.date
    || typeof day.weekday !== 'string'
    || day.weekday.toLocaleLowerCase('hu-HU')
      !== weekdayFormatter.format(new Date(`${day.date}T12:00:00Z`))
    || day.order !== index
    || seenDates.has(day.date)
    || !Array.isArray(day.programItems)
  ) {
    throw new Error(`Program day at position ${index} is invalid.`);
  }
  seenDates.add(day.date);

  for (const item of day.programItems) {
    if (
      typeof item.id !== 'string'
      || !/^[a-zA-Z0-9_-]+$/.test(item.id)
      || typeof item.title !== 'string'
      || typeof item.startsAt !== 'string'
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.startsAt)
      || (item.endsAt !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.endsAt))
    ) {
      throw new Error(`Program item in ${day.date} is invalid.`);
    }
  }
}

if (
  event.days[0].date !== event.startDate
  || event.days.at(-1).date !== event.endDate
) {
  throw new Error('The first and last program day must match the event dates.');
}

const { days, ...eventMetadata } = event;
const programItemCount = days.reduce((count, day) => count + day.programItems.length, 0);

if (dryRun) {
  console.log(`Validated ${event.id}: ${days.length} days and ${programItemCount} program items.`);
  process.exit(0);
}

const { applicationDefault, initializeApp } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
const app = initializeApp({ credential: applicationDefault() });
const db = getFirestore(app);
const eventRef = db.collection('events').doc(event.id);
const writes = [
  { ref: eventRef, data: { ...eventMetadata, updatedAt: new Date() } },
  ...days.flatMap((day) => {
    const { programItems, ...dayMetadata } = day;
    const dayRef = eventRef.collection('days').doc(day.id);
    return [
      { ref: dayRef, data: dayMetadata },
      ...programItems.map((item) => ({
        ref: dayRef.collection('programItems').doc(item.id),
        data: item,
      })),
    ];
  }),
];

for (let offset = 0; offset < writes.length; offset += 450) {
  const batch = db.batch();
  writes.slice(offset, offset + 450).forEach(({ ref, data }) => batch.set(ref, data, { merge: true }));
  await batch.commit();
}

console.log(`Imported ${event.id} (${writes.length - 1} day and program documents).`);
