const { onDocumentWritten, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const VALID_EVENT_TYPES = new Set(['diaknapok', 'februtalis']);
const VALID_PROGRAM_TYPES = new Set([
  'pub_crawl',
  'game_block_a',
  'game_block_b',
  'kart',
  'gokart',
  'case',
  'party',
  'other',
]);

function validateEdition(eventId, edition) {
  if (!edition || typeof edition !== 'object') {
    throw new Error(`events/${eventId} is missing edition metadata.`);
  }
  if (!VALID_EVENT_TYPES.has(edition.type)) {
    throw new Error(`events/${eventId} has unsupported type: ${String(edition.type)}`);
  }
  if (!Number.isInteger(edition.editionYear) || edition.editionYear < 2025) {
    throw new Error(`events/${eventId} has invalid editionYear.`);
  }
  if (typeof edition.title !== 'string' || !edition.title.trim()) {
    throw new Error(`events/${eventId} is missing a title.`);
  }
  if (typeof edition.startDate !== 'string' || typeof edition.endDate !== 'string') {
    throw new Error(`events/${eventId} is missing valid startDate/endDate.`);
  }
}

function validateDay(day) {
  if (!day || typeof day !== 'object') {
    throw new Error('Day payload is invalid.');
  }
  if (typeof day.weekday !== 'string' || !day.weekday.trim()) {
    throw new Error('Day weekday is missing.');
  }
  if (typeof day.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
    throw new Error(`Day date is invalid: ${String(day.date)}`);
  }
  if (!Number.isInteger(day.order) || day.order < 0) {
    throw new Error(`Day order is invalid: ${String(day.order)}`);
  }
}

function validateProgram(program, eventType) {
  if (!program || typeof program !== 'object') {
    throw new Error('Program payload is invalid.');
  }
  if (typeof program.title !== 'string' || !program.title.trim()) {
    throw new Error('Program title is required.');
  }
  if (typeof program.startsAt !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(program.startsAt)) {
    throw new Error(`Program startsAt is invalid: ${String(program.startsAt)}`);
  }
  if (program.type && !VALID_PROGRAM_TYPES.has(program.type)) {
    throw new Error(`Unsupported program type: ${String(program.type)}`);
  }
  if (program.eventType && program.eventType !== eventType) {
    throw new Error('Program eventType mismatches edition eventType.');
  }
}

exports.onEditionWrite = onDocumentWritten('events/{eventId}', async (event) => {
  const after = event.data?.after;
  const before = event.data?.before;
  const eventId = event.params.eventId;

  if (!after || !after.exists) {
    return;
  }

  const edition = after.data();
  validateEdition(eventId, edition);

  const daySnapshot = await db.collection('events').doc(eventId).collection('days').get();
  const ordered = daySnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));

  for (const [index, day] of ordered.entries()) {
    validateDay(day);
    if (day.order !== index) {
      await db.collection('events').doc(eventId).collection('days').doc(day.id).update({ order: index });
      logger.info(`Normalized day order for ${eventId}/${day.id} to ${index}`);
    }
  }

  if (before?.exists) {
    logger.info(`Edition ${eventId} updated from ${before.data().type} to ${edition.type}`);
  }
});

exports.onDayWrite = onDocumentWritten('events/{eventId}/days/{dayId}', async (event) => {
  const after = event.data?.after;
  const eventId = event.params.eventId;
  const dayId = event.params.dayId;

  if (!after || !after.exists) {
    return;
  }

  const editionSnapshot = await db.collection('events').doc(eventId).get();
  const edition = editionSnapshot.data();
  if (!edition) {
    return;
  }

  const day = after.data();
  validateDay(day);
  if (day.eventType && day.eventType !== edition.type) {
    throw new Error(`Day ${eventId}/${dayId} mismatches edition type.`);
  }

  const programSnapshot = await db.collection('events').doc(eventId).collection('days').doc(dayId).collection('programItems').get();
  for (const programDoc of programSnapshot.docs) {
    const program = programDoc.data();
    validateProgram(program, edition.type);
    if (program.dayId && program.dayId !== dayId) {
      throw new Error(`Program ${programDoc.id} is attached to the wrong day.`);
    }
  }
});

exports.onDayDelete = onDocumentDeleted('events/{eventId}/days/{dayId}', async (event) => {
  const eventId = event.params.eventId;
  const dayId = event.params.dayId;
  const programSnapshot = await db.collection('events').doc(eventId).collection('days').doc(dayId).collection('programItems').get();

  if (!programSnapshot.empty) {
    throw new Error(`Cannot delete day ${eventId}/${dayId} while it still contains programItems.`);
  }

  logger.info(`Safe delete of empty day: ${eventId}/${dayId}`);
});

exports.onProgramWrite = onDocumentWritten('events/{eventId}/days/{dayId}/programItems/{programId}', async (event) => {
  const after = event.data?.after;
  const eventId = event.params.eventId;
  const dayId = event.params.dayId;

  if (!after || !after.exists) {
    return;
  }

  const editionSnapshot = await db.collection('events').doc(eventId).get();
  const edition = editionSnapshot.data();
  if (!edition) {
    return;
  }

  const program = after.data();
  validateProgram(program, edition.type);
  if (program.dayId && program.dayId !== dayId) {
    throw new Error(`Program ${eventId}/${dayId}/${event.params.programId} is assigned to a different day.`);
  }

  await after.ref.set({
    dayId,
    eventType: edition.type,
    editionYear: edition.editionYear,
  }, { merge: true });
});

module.exports = {
  onEditionWrite,
  onDayWrite,
  onDayDelete,
  onProgramWrite,
};
