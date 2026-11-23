import assert from 'node:assert/strict';
import test from 'node:test';

import { getActiveEvent } from './event-schedule.ts';

test('November 30 remains Diáknapok until Romanian midnight', () => {
  assert.equal(getActiveEvent(new Date('2026-11-30T21:59:59Z')), 'diaknapok');
});

test('December 1 switches to Februtális at Romanian midnight', () => {
  assert.equal(getActiveEvent(new Date('2026-11-30T22:00:00Z')), 'februtalis');
});

test('February 29 in a leap year is in the Februtális season', () => {
  assert.equal(getActiveEvent(new Date('2028-02-28T22:00:00Z')), 'februtalis');
});

test('March 15 remains Februtális through the end of the Romanian day', () => {
  assert.equal(getActiveEvent(new Date('2027-03-15T21:59:59Z')), 'februtalis');
});

test('March 16 switches to Diáknapok at Romanian midnight', () => {
  assert.equal(getActiveEvent(new Date('2027-03-15T22:00:00Z')), 'diaknapok');
});

test('the end of the year remains in the Februtális season', () => {
  assert.equal(getActiveEvent(new Date('2026-12-31T22:00:00Z')), 'februtalis');
});

test('the beginning of the year remains in the Februtális season', () => {
  assert.equal(getActiveEvent(new Date('2027-01-01T00:00:00Z')), 'februtalis');
});
