/**
 * MMDSZ – a valodi Firebase callable forrasbol kinyert szerveroldali logika tesztjei.
 *
 * NEM telepit, nem kapcsolodik az eles Firebase projekthez, nem modosit felhasznalot.
 * A Firestore tranzakciok es az Auth in-memory tesztduplakkal futnak.
 * Futtatas: node --test tests/registration-functions.test.cjs
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const SOURCE = path.resolve(__dirname, '../../functions/src/index.ts');
const sourceText = fs.readFileSync(SOURCE, 'utf8');
const sourceFile = ts.createSourceFile(SOURCE, sourceText, ts.ScriptTarget.Latest, true);

const functions = [
  'requireUid', 'requiredString', 'normalizeTeamName',
  'profileIsActive', 'assertHeadOrganizer', 'validTeamName',
];
const constants = [
  'HEAD_ORGANIZER', 'ORGANIZER', 'JURY', 'CAPTAIN', 'DEPUTY_CAPTAIN', 'TEAM_MEMBER',
];
const callables = ['reviewCaptainRegistration', 'reviewPendingMembership'];

function declaration(name, kind) {
  for (const stmt of sourceFile.statements) {
    if (kind === 'function' && ts.isFunctionDeclaration(stmt) && stmt.name?.text === name) {
      return stmt.getText(sourceFile);
    }
    if (kind === 'variable' && ts.isVariableStatement(stmt) &&
      stmt.declarationList.declarations.some(d => ts.isIdentifier(d.name) && d.name.text === name)) {
      return stmt.getText(sourceFile);
    }
  }
  throw new Error(`Hianyzik az eles szerverforrasbol a ${kind}: ${name}`);
}

const actualCode = [
  ...constants.map(n => declaration(n, 'variable')),
  ...functions.map(n => declaration(n, 'function')),
  ...callables.map(n => declaration(n, 'variable')),
].join('\n\n');
const compilation = ts.transpileModule(actualCode, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  reportDiagnostics: true,
});
const compileErrors = (compilation.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
if (compileErrors.length) {
  throw new Error('Nem tudtam forditani a Firebase callable fuggvenyeket: ' +
    compileErrors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; '));
}

const DELETE = Symbol('DELETE');
function clone(v) { return structuredClone(v); }
function putPatch(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (value === DELETE) delete target[key];
    else target[key] = value;
  }
}

function fixture({ reviewerRole = 'Főszervező', reviewerActive = true,
  reviewerDisabled = false, emailVerified = true, pendingRole = 'Szervező',
  proof = '', membershipStatus = 'pending_admin_activation', accountStatus = 'pending_admin_activation',
  disabledTarget = false, captain = false, teamExists = false,
  captainRequestStatus = 'pending', captainTeamName = 'Teszt Csapat' } = {}) {
  const database = new Map();
  database.set('users/admin', {
    role: reviewerRole, accountStatus: reviewerActive ? 'active' : 'pending_admin_approval',
    isVerified: reviewerActive, ...(reviewerDisabled ? {isDisabled: true} : {}),
  });
  const target = { role: 'Csapattag', accountStatus, membershipStatus, isVerified: false, team: 'Teszt Csapat',
    ...(typeof pendingRole === 'string' ? { pendingRole } : {}),
    ...(proof ? {igazolas: proof} : {}),
    ...(disabledTarget ? {isDisabled: true} : {}),
  };
  if (captain) {
    target.accountStatus = 'pending_captain_approval';
    target.membershipStatus = 'pending_captain_approval';
    target.team = '';
    target.requestedTeamName = captainTeamName;
    database.set('captain_registrations/target', { status: captainRequestStatus, teamName: captainTeamName });
    if (teamExists) database.set('teams/' + captainTeamName, {name: captainTeamName});
  }
  database.set('users/target', target);

  const authReads = [];
  const auth = {
    async getUser(uid) { authReads.push(uid); return {uid, emailVerified}; },
  };
  const db = {
    collection(name) { return { doc(id) {return ref(`${name}/${id}`);} }; },
    async runTransaction(operation) {
      const changes = [];
      const tr = {
        async get(reference) { return snapshot(reference.path); },
        create(reference, data) {
          if (database.has(reference.path)) throw new Error('Dokumentum mar letezik: ' + reference.path);
          changes.push({type: 'create', path:reference.path, data});
        },
        update(reference, data) {
          if (!database.has(reference.path)) throw new Error('Hianyzo dokumentum: ' + reference.path);
          changes.push({type:'update', path:reference.path, data});
        },
      };
      await operation(tr);
      for (const change of changes) {
        if (change.type === 'create') {
          const value = {};
          putPatch(value, change.data);
          database.set(change.path, value);
        } else {
          putPatch(database.get(change.path), change.data);
        }
      }
    },
  };
  function ref(p) { return {path:p, get:async()=>snapshot(p)}; }
  function snapshot(p) {
    const value = database.get(p);
    return {exists:!!value, data(){return value ? clone(value) : undefined;},
      get(field){return value?.[field]}};
  }
  class HttpsError extends Error {
    constructor(code, message) { super(message); this.code=code; this.name='HttpsError'; }
  }
  const exports = {};
  const context = {
    exports, onCall: handler => handler, db, auth, HttpsError,
    FieldValue: {serverTimestamp:()=>'(server-timestamp)', delete:()=>DELETE},
  };
  vm.runInNewContext(compilation.outputText, context, {filename:'MMDSZ/functions/src/index.ts', timeout: 3000});
  const call = (which, data, reviewer='admin') => context.exports[which]({
    auth: reviewer === null ? undefined : {uid:reviewer},
    data: {uid:'target', ...data},
  });
  return {call, database, authReads,
    member:(data,reviewer)=>call('reviewPendingMembership',data,reviewer),
    captain:(data,reviewer)=>call('reviewCaptainRegistration',data,reviewer)};
}

async function rejectedWith(promise, expectedCode) {
  await assert.rejects(promise, err => {
    assert.equal(err.code, expectedCode, `Vart hibakod: ${expectedCode}, kapott: ${err.code} / ${err.message}`);
    return true;
  });
}

// ----- Meghivott szervezok, zsuri es csapattagok -----
test('Sima szervezo nem hagyhat jova, es elotte Auth adatot sem kerhet le', async () => {
  const f=fixture({reviewerRole:'Szervező'});
  await rejectedWith(f.member({approved:true}), 'permission-denied');
  assert.deepEqual(f.authReads, []);
  assert.equal(f.database.get('users/target').accountStatus, 'pending_admin_activation');
});

test('Sima szervezo nem utasithat el regisztraciot', async () => {
  const f=fixture({reviewerRole:'Szervező'});
  await rejectedWith(f.member({approved:false}), 'permission-denied');
  assert.equal(f.database.get('users/target').membershipStatus,'pending_admin_activation');
});

test('Nem aktiv vagy letiltott foszervezo nem hagyhat jova', async () => {
  const f=fixture({reviewerActive:false});
  await rejectedWith(f.member({approved:true}), 'permission-denied');
  const g=fixture({reviewerDisabled:true});
  await rejectedWith(g.member({approved:false}), 'permission-denied');
});

test('Bejelentkezes nelkul tilos a jovahagyas', async () => {
  const f=fixture();
  await rejectedWith(f.member({approved:true}, null), 'unauthenticated');
});

test('A fuggo szervezobol jovahagyas utan Szervezo lesz (igazolas nelkul)', async () => {
  const f=fixture();
  assert.equal((await f.member({approved:true})).status, 'approved');
  const u=f.database.get('users/target');
  assert.equal(u.role,'Szervező');
  assert.equal(u.accountStatus,'active');
  assert.equal(u.membershipStatus,'active');
  assert.equal(u.isVerified,true);
  assert.equal(u.pendingRole,undefined);
  assert.equal(u.approvedBy,'admin');
});

test('A zsuritag igazolas nelkul is jovahagyhato', async () => {
  const f=fixture({pendingRole:'Zsűri'});
  await f.member({approved:true});
  assert.equal(f.database.get('users/target').role,'Zsűri');
});

test('Igazolas nelkul csapattag es alkapitany nem aktivalhato', async () => {
  for (const role of ['Csapattag','Alcsapatkapitány']) {
    const f=fixture({pendingRole:role});
    await rejectedWith(f.member({approved:true}), 'failed-precondition');
    assert.equal(f.database.get('users/target').accountStatus,'pending_admin_activation');
  }
});

test('Igazolassal csapattag es alkapitany is aktiv', async () => {
  for (const role of ['Csapattag','Alcsapatkapitány']) {
    const f=fixture({pendingRole:role, proof:'uploads/test.png'});
    await f.member({approved:true});
    assert.equal(f.database.get('users/target').role,role);
    assert.equal(f.database.get('users/target').isVerified,true);
  }
});

test('Meg nem erositett e-mail cimmel nem jovahagyhato', async () => {
  const f=fixture({emailVerified:false});
  await rejectedWith(f.member({approved:true}), 'failed-precondition');
  assert.equal(f.database.get('users/target').accountStatus,'pending_admin_activation');
});

test('Kikapcsolt fiok nem aktivalhato', async () => {
  const f=fixture({disabledTarget:true});
  await rejectedWith(f.member({approved:true}), 'failed-precondition');
});

test('Aktiv es elutasitott kerelmet nem lehet ujra jovahagyni', async () => {
  for (const status of ['active','rejected']) {
    const f=fixture({membershipStatus:status});
    await rejectedWith(f.member({approved:true}), 'failed-precondition');
  }
});

test('Elutasitas lezarta a regisztraciot, nem ad jogosultsagot', async () => {
  const f=fixture();
  assert.equal((await f.member({approved:false})).status, 'rejected');
  const u=f.database.get('users/target');
  assert.equal(u.role,'Csapattag');
  assert.equal(u.accountStatus,'rejected');
  assert.equal(u.membershipStatus,'rejected');
  assert.equal(u.isVerified,false);
  assert.equal(u.pendingRole,undefined);
  assert.equal(u.rejectedBy,'admin');
});

test('Ervenytelen kerelmezett szerepkor nem aktivalhato', async () => {
  const f=fixture({pendingRole:'Főszervező'});
  await rejectedWith(f.member({approved:true}), 'failed-precondition');
});

test('Hianyzo jovahagyasi boolean nem fogadhato el', async () => {
  const f=fixture();
  await rejectedWith(f.member({}), 'invalid-argument');
});

test('Hianyzo pendingRole es igazolassal sem aktivalhato regi fiok', async () => {
  const f=fixture({pendingRole:null, proof:'uploads/legacy.png'});
  await rejectedWith(f.member({approved:true}), 'failed-precondition');
});

// ----- Kapitanyi regisztracio -----
test('Csak foszervezo biralhat el kapitanyi jelentkezest', async () => {
  const f=fixture({captain:true,reviewerRole:'Szervező', proof:'uploads/captain.png'});
  await rejectedWith(f.captain({approved:true}), 'permission-denied');
  assert.deepEqual(f.authReads, []);
});

test('Kapitany elfogadasa letrehozza a csapatot es aktivalja a szerepet', async () => {
  const f=fixture({captain:true,proof:'uploads/captain.png'});
  assert.equal((await f.captain({approved:true})).status, 'approved');
  const u=f.database.get('users/target');
  assert.equal(u.role,'Csapatkapitány');
  assert.equal(u.team,'Teszt Csapat');
  assert.equal(u.accountStatus,'active');
  assert.equal(u.membershipStatus,'active');
  assert.equal(u.isVerified,true);
  assert.equal(u.approvedBy,'admin');
  assert.equal(f.database.get('captain_registrations/target').status,'approved');
  assert.equal(f.database.get('teams/Teszt Csapat').createdBy,'target');
});

test('Kapitanyi jovahagyashoz email megerosites es igazolas is kotelezo', async () => {
  const f=fixture({captain:true,proof:'uploads/captain.png',emailVerified:false});
  await rejectedWith(f.captain({approved:true}), 'failed-precondition');
  const g=fixture({captain:true});
  await rejectedWith(g.captain({approved:true}), 'failed-precondition');
  assert.equal(g.database.has('teams/Teszt Csapat'),false);
});

test('Mar letezo csapatnevvel kapitany nem fogadhato el', async () => {
  const f=fixture({captain:true,proof:'uploads/captain.png',teamExists:true});
  await rejectedWith(f.captain({approved:true}), 'already-exists');
  assert.equal(f.database.get('users/target').accountStatus,'pending_captain_approval');
});

test('Kapitanyi elutasitas nem hoz letre csapatot, jogosultsagot sem ad', async () => {
  const f=fixture({captain:true});
  assert.equal((await f.captain({approved:false})).status, 'rejected');
  assert.equal(f.database.has('teams/Teszt Csapat'),false);
  assert.equal(f.database.get('captain_registrations/target').status,'rejected');
  assert.equal(f.database.get('users/target').accountStatus,'rejected');
  assert.equal(f.database.get('users/target').membershipStatus,'rejected');
});

test('Mar elbiralt kapitanyi kerelmet nem lehet ujra elbiralni', async () => {
  const f=fixture({captain:true,captainRequestStatus:'approved'});
  await rejectedWith(f.captain({approved:false}), 'failed-precondition');
});
