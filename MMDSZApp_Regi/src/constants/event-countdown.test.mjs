import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getEventCountdown } from './event-countdown.ts';
import { getNextRomanianMidnight, getRomanianMidnight } from './event-schedule.ts';

const februtalis = JSON.parse(await readFile(
  new URL('../../data/events/februtalis-2027.json', import.meta.url),
  'utf8',
));
const diaknapok = JSON.parse(await readFile(
  new URL('../../data/events/diaknapok-2027.json', import.meta.url),
  'utf8',
));

function editionCountdown(edition, now) {
  const startsAt = edition.startDate ? getRomanianMidnight(edition.startDate) : null;
  const endsAt = edition.endDate
    ? getNextRomanianMidnight(getRomanianMidnight(edition.endDate))
    : null;
  return getEventCountdown(startsAt, endsAt, now);
}

test('Februtális home heading, date label and countdown dates come from its edition data', () => {
  assert.equal(februtalis.displayTitle, 'FEBRUTÁLIS');
  assert.equal(februtalis.dateLabel, '2027. február 26-27.');
  assert.equal(februtalis.startDate, '2027-02-26');
  assert.equal(februtalis.endDate, '2027-02-27');
  assert.equal(februtalis.timeZone, 'Europe/Bucharest');
  assert.equal(
    getRomanianMidnight(februtalis.startDate).toISOString(),
    '2027-02-25T22:00:00.000Z',
  );
});

test('Diáknapok heading and date label remain edition-specific', () => {
  assert.equal(diaknapok.displayTitle, '28. MAROSVÁSÁRHELYI DIÁKNAPOK');
  assert.equal(diaknapok.dateLabel, '2027. május 19-22.');
});

test('Februtális countdown runs until February 26 at Romanian midnight', () => {
  const countdown = editionCountdown(februtalis, new Date('2027-02-25T21:59:59Z'));
  assert.equal(countdown.status, 'upcoming');
  assert.equal(countdown.days, 0);
  assert.equal(countdown.hours, 0);
  assert.equal(countdown.minutes, 0);
  assert.equal(countdown.seconds, 1);
});

test('Februtális is ongoing on February 26 and 27', () => {
  for (const now of ['2027-02-26T12:00:00+02:00', '2027-02-27T12:00:00+02:00']) {
    assert.equal(editionCountdown(februtalis, new Date(now)).status, 'ongoing');
  }
});

test('Februtális has ended at February 28 Romanian midnight', () => {
  assert.equal(editionCountdown(februtalis, new Date('2027-02-27T22:00:00Z')).status, 'ended');
});

test('Diáknapok countdown runs until May 19 at Romanian midnight', () => {
  assert.equal(editionCountdown(diaknapok, new Date('2027-05-18T20:59:59Z')).seconds, 1);
});

test('Diáknapok is ongoing on each day from May 19 through May 22', () => {
  for (const now of [
    '2027-05-19T12:00:00+03:00',
    '2027-05-20T12:00:00+03:00',
    '2027-05-21T12:00:00+03:00',
    '2027-05-22T12:00:00+03:00',
  ]) {
    assert.equal(editionCountdown(diaknapok, new Date(now)).status, 'ongoing');
  }
});

test('Diáknapok has ended at May 23 Romanian midnight', () => {
  assert.equal(editionCountdown(diaknapok, new Date('2027-05-22T21:00:00Z')).status, 'ended');
});

test('no published edition reports an unpublished countdown', () => {
  assert.equal(getEventCountdown(null, null, new Date('2027-01-01T00:00:00Z')).status, 'unpublished');
});
