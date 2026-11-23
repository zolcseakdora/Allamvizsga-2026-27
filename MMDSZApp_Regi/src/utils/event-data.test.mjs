import assert from 'node:assert/strict';
import test from 'node:test';

import { isVisibleForEvent } from './event-data.ts';

const diakEdition = {
  id: 'diaknapok-2027',
  type: 'diaknapok',
  editionYear: 2027,
};
const februtalisEdition = {
  id: 'februtalis-2027',
  type: 'februtalis',
  editionYear: 2027,
};

test('Februtális selection excludes Diáknapok-specific content', () => {
  assert.equal(isVisibleForEvent({
    eventType: 'diaknapok',
    editionYear: 2027,
  }, 'februtalis', februtalisEdition), false);
});

test('Diáknapok selection excludes Februtális-specific content', () => {
  assert.equal(isVisibleForEvent({
    eventType: 'februtalis',
    editionYear: 2027,
  }, 'diaknapok', diakEdition), false);
});

test('legacy data without event metadata stays visible only for Diáknapok', () => {
  assert.equal(isVisibleForEvent({}, 'diaknapok', diakEdition), true);
  assert.equal(isVisibleForEvent({}, 'februtalis', februtalisEdition), false);
});

test('content is limited to the selected edition year and id', () => {
  assert.equal(isVisibleForEvent({
    eventType: 'februtalis',
    editionYear: 2026,
  }, 'februtalis', februtalisEdition), false);
  assert.equal(isVisibleForEvent({
    eventType: 'februtalis',
    editionId: 'februtalis-2026',
  }, 'februtalis', februtalisEdition), false);
});
