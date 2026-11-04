'use strict';
const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = 'demo-mmdsz-shared-code';
const authHost = '127.0.0.1:9099';
const firestoreHost = '127.0.0.1:8091';
const functionsHost = '127.0.0.1:5001';
if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== authHost
    || process.env.FIRESTORE_EMULATOR_HOST !== firestoreHost) {
  throw new Error('Csak helyi Firebase-emulátorban futtatható.');
}
const app = initializeApp({ projectId });
const adminAuth = getAuth(app);
const db = getFirestore(app);
const password = 'TesztRegisztracio123!';

async function user(email, profile) {
  const created = await adminAuth.createUser({ email, password, emailVerified: true });
  if (profile) await db.doc('users/' + created.uid).set(profile);
  const response = await fetch(
    'http://' + authHost + '/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local',
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }) },
  );
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  assert.ok(result.idToken);
  return { uid: created.uid, token: result.idToken };
}

async function call(name, token, data = {}) {
  const response = await fetch(
    'http://' + functionsHost + '/' + projectId + '/europe-west1/' + name,
    { method: 'POST', headers: { 'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token }, body: JSON.stringify({ data }) },
  );
  const result = await response.json();
  return { status: response.status, body: result.result, error: result.error };
}

test('közös kód: két kapitány, főszervezői jog, visszavonás', async () => {
  const admin = await user('admin.shared@example.com', {
    name: 'Főszervező Teszt', role: 'Főszervező',
    isVerified: true, accountStatus: 'active',
  });
  const a = await user('captain.a@example.com');
  const b = await user('captain.b@example.com');
  const c = await user('captain.c@example.com');

  assert.equal((await call('createCaptainRegistrationCode', a.token)).status, 403);
  const generated = await call('createCaptainRegistrationCode', admin.token);
  assert.equal(generated.status, 200, JSON.stringify(generated));
  assert.match(generated.body.code, /^MMDSZ-/);
  const code = generated.body.code;

  assert.equal((await call('createCaptainRegistrationCode', admin.token)).status, 400);
  for (const [captain, name, teamName] of [[a,'Első Kapitány','Próba Egy'],[b,'Második Kapitány','Próba Kettő']]) {
    const result = await call('requestCaptainRegistration', captain.token, { code, name, teamName });
    assert.equal(result.status, 200, JSON.stringify(result));
    assert.equal(result.body.status, 'pending_captain_approval');
    const registration = await db.doc('captain_registrations/' + captain.uid).get();
    assert.equal(registration.get('status'), 'pending');
  }
  assert.equal((await db.collection('teams').get()).size, 0);
  const shared = await db.doc('captain_registration_codes/shared').get();
  assert.equal(shared.get('status'), 'available');
  assert.ok(shared.get('codeHash'));
  assert.equal(shared.get('code'), undefined);

  const repeat = await call('requestCaptainRegistration', a.token,
    { code, name: 'Első Kapitány', teamName: 'Próba Egy' });
  assert.equal(repeat.status, 200, JSON.stringify(repeat));

  const status = await call('getCaptainRegistrationCodeStatus', admin.token);
  assert.equal(status.status, 200, JSON.stringify(status));
  assert.equal(status.body.active, true);
  assert.equal('code' in status.body, false);

  const revoked = await call('revokeCaptainRegistrationCode', admin.token);
  assert.equal(revoked.status, 200, JSON.stringify(revoked));
  const rejected = await call('requestCaptainRegistration', c.token,
    { code, name: 'Harmadik Kapitány', teamName: 'Próba Három' });
  assert.equal(rejected.status, 400, JSON.stringify(rejected));
  assert.equal((await db.doc('captain_registrations/' + c.uid).get()).exists, false);
  const finalStatus = await call('getCaptainRegistrationCodeStatus', admin.token);
  assert.equal(finalStatus.body.active, false);
});

after(async () => { await deleteApp(app); });
