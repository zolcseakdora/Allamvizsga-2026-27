import assert from 'node:assert/strict';
import test from 'node:test';

import { isProgramTypeVisible } from './event-programs.ts';

test('Februtális supports the selected program categories across its days', () => {
  assert.equal(isProgramTypeVisible('februtalis', 'Péntek', 'pub_crawl'), true);
  assert.equal(isProgramTypeVisible('februtalis', 'Péntek', 'gokart'), true);
  assert.equal(isProgramTypeVisible('februtalis', 'Szombat', 'case'), true);
  assert.equal(isProgramTypeVisible('februtalis', 'Szombat', 'party'), true);
  assert.equal(isProgramTypeVisible('februtalis', 'Szombat', 'game_block_a'), true);
  assert.equal(isProgramTypeVisible('februtalis', 'Szombat', 'game_block_b'), true);
  assert.equal(isProgramTypeVisible('februtalis', 'Szombat', 'sports'), false);
});

test('Diáknapok preserves its existing program types and weekdays', () => {
  assert.equal(isProgramTypeVisible('diaknapok', 'Szerda', undefined), true);
  assert.equal(isProgramTypeVisible('diaknapok', 'Szombat', 'pub_crawl'), true);
  assert.equal(isProgramTypeVisible('diaknapok', 'Csütörtök', 'other'), true);
});

test('Februtális blocks program categories outside the allowed day windows', () => {
  assert.equal(isProgramTypeVisible('februtalis', 'Péntek', 'case'), false);
  assert.equal(isProgramTypeVisible('februtalis', 'Szombat', 'gokart'), false);
  assert.equal(isProgramTypeVisible('februtalis', 'Szerda', 'other'), true);
});
