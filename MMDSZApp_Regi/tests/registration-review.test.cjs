const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// A tiszta szerepkör-megjelenítési segédfüggvényeket futtatjuk.
const source = fs.readFileSync(path.join(__dirname, '../src/utils/registration-review.ts'), 'utf8');
const transpiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleShim = { exports: {} };
new Function('module', 'exports', transpiled)(moduleShim, moduleShim.exports);
const { isRegistrationReviewPending, requestedRegistrationRole, registrationStatusLabel } = moduleShim.exports;

test('A szervezo aktiv szerepkore nem valtozik automatikusan', () => {
  const pending = { role: 'Csapattag', pendingRole: 'Szervező', accountStatus: 'pending_admin_activation' };
  assert.equal(requestedRegistrationRole(pending), 'Szervező');
  assert.equal(pending.role, 'Csapattag');
  assert.equal(isRegistrationReviewPending(pending), true);
});
test('Kapitanyi kérelem a kert szerepkort mutatja', () => {
  assert.equal(requestedRegistrationRole({ role: 'Csapattag', accountStatus: 'pending_captain_approval' }), 'Csapatkapitány');
});
test('E-mailre varo szemely nem hagyhato jova', () => {
  assert.equal(isRegistrationReviewPending({ accountStatus: 'pending_email_verification', pendingRole: 'Zsűri' }), false);
});
test('Aktiv es elutasitott felhasznalo nem hagyhato jova ujra', () => {
  assert.equal(isRegistrationReviewPending({ accountStatus: 'active' }), false);
  assert.equal(isRegistrationReviewPending({ accountStatus: 'rejected' }), false);
});
test('Csapattag es alkapitany pending statuszt fel lehet ismerni', () => {
  assert.equal(isRegistrationReviewPending({ membershipStatus: 'pending_verification' }), true);
  assert.equal(isRegistrationReviewPending({ membershipStatus: 'pending_admin_approval' }), true);
});
test('Regisztracio allapotának magyar cimkeje', () => {
  assert.equal(registrationStatusLabel({ accountStatus: 'pending_admin_activation' }), 'Főszervezői jóváhagyásra vár');
});
