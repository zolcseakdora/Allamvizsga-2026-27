'use strict';
// Offline regression tests: extracts the actual Firebase callable source and
// executes its logic against in-memory transaction/Auth stubs. Never contacts Firebase.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');

const SOURCE = path.resolve(__dirname, '../../functions/src/index.ts');
const sourceText = fs.readFileSync(SOURCE, 'utf8');
const sourceFile = ts.createSourceFile(SOURCE, sourceText, ts.ScriptTarget.Latest, true);
function declaration(name, kind, optional = false) {
  for (const stmt of sourceFile.statements) {
    if (kind === 'function' && ts.isFunctionDeclaration(stmt) && stmt.name?.text === name) return stmt.getText(sourceFile);
    if (kind === 'variable' && ts.isVariableStatement(stmt) &&
      stmt.declarationList.declarations.some(d => ts.isIdentifier(d.name) && d.name.text === name)) return stmt.getText(sourceFile);
  }
  if (optional) return '';
  throw new Error(`Nincs meg a Firebase forrasaban: ${name}. Nem talalgatjuk az uj kodot.`);
}
const snippets = [
  ...['HEAD_ORGANIZER','ORGANIZER','JURY','CAPTAIN','DEPUTY_CAPTAIN','TEAM_MEMBER','INVITE_LIFETIME_MS'].map(n=>declaration(n,'variable')),
  ...['requireUid','requiredString','normalizeTeamName','profileIsActive','validEmail','escapeHtml'].map(n=>declaration(n,'function')),
  declaration('configuredHttpsUrl','function',true),
  ...['createInvite','prepareInvitedRegistration','redeemInvite'].map(n=>declaration(n,'variable')),
].filter(Boolean).join('\n\n');
const compiled = ts.transpileModule(snippets,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
const errors=(compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
if(errors.length) throw new Error(errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText,'; ')).join('; '));

const DELETE=Symbol('delete');
class Stamp {
  constructor(millis){this.millis=millis;}
  toMillis(){return this.millis;}
  toDate(){return new Date(this.millis);}
  static now(){return new Stamp(Date.now());}
  static fromMillis(n){return new Stamp(n);}
}
class HttpsError extends Error { constructor(code,message){super(message);this.code=code;} }
const fresh=()=>new Map();
let counter=0;
function fixture({inviterRole='Csapatkapitány',inviterTeam='A Firm',inviterActive=true,
  invitedEmail='teszt@example.org',invitedRole='Csapattag',inviteTeam='A Firm',
  expires=Date.now()+86400000,inviteStatus='Függőben',hasInvite=true,
  emailVerified=false,callerEmail='teszt@example.org',hasProfile=false,profileData={}}={}) {
  const data=fresh();
  data.set('users/inviter',{role:inviterRole,team:inviterTeam,accountStatus:inviterActive?'active':'pending_admin_activation',isVerified:inviterActive});
  if(hasInvite)data.set('invites/'+invitedEmail,{email:invitedEmail,team:inviteTeam,role:invitedRole,status:inviteStatus,expiresAt:new Stamp(expires)});
  if(hasProfile)data.set('users/invitee',{role:'Csapattag',accountStatus:'pending_email_verification',membershipStatus:'pending_email_verification',email:callerEmail,team:'',isVerified:false,...profileData});
  function reference(p){return {path:p,async get(){return snapshot(p)}};}
  function snapshot(p){const d=data.get(p);return {exists:!!d,data(){return d ? {...d}:undefined},get(k){return d?.[k]}};}
  function mutate(p,patch,mode){
    if(mode==='create' && data.has(p))throw new Error('Existing doc '+p);
    if(mode==='update' && !data.has(p))throw new Error('Missing doc '+p);
    const o=mode==='set'?{}:{...data.get(p)};
    for(const [k,v] of Object.entries(patch)){if(v===DELETE)delete o[k];else o[k]=v;}
    data.set(p,o);
  }
  const db={collection(name){return {doc(id){return reference(name+'/'+(id||`generated${++counter}`))}}},
    async runTransaction(task){const operations=[];const t={get(ref){return Promise.resolve(snapshot(ref.path))},
      set(ref,doc){operations.push(['set',ref.path,doc])},create(ref,doc){operations.push(['create',ref.path,doc])},update(ref,doc){operations.push(['update',ref.path,doc])}};
      const result=await task(t);for(const [kind,p,doc] of operations)mutate(p,doc,kind);return result;}};
  const context={exports:{},db,onCall:(fn)=>fn,HttpsError,Timestamp:Stamp,
    FieldValue:{serverTimestamp:()=>new Stamp(Date.now()),delete:()=>DELETE},
    randomBytes:crypto.randomBytes,URL,process:{env:{MMDSZ_APP_URL:'https://example.org',MMDSZ_INSTALL_URL:''}}};
  vm.runInNewContext(compiled.outputText,context,{filename:'functions/src/index.ts',timeout:5000});
  async function invoke(fn,body={},uid='invitee',email=callerEmail,verified=emailVerified){return context.exports[fn]({auth:uid?{uid,token:{email,email_verified:verified}}:undefined,data:body});}
  return {invoke,data,snapshot};
}
async function expectsError(run,code){await assert.rejects(run,e=>{assert.equal(e.code,code,`Kod: ${e.code}; uzenet: ${e.message}`);return true;});}
const validInvite={email:'teszt@example.org',team:'A Firm',role:'Csapattag'};

test('1. Bejelentkezes nelkul senki nem hozhat letre meghivot',async()=>{
  const f=fixture({hasInvite:false});await expectsError(f.invoke('createInvite',validInvite,null), 'unauthenticated');
});
test('2. Aktiv kapitany csak sajat csapattagot hivhat meg',async()=>{
  const f=fixture({hasInvite:false});await f.invoke('createInvite',validInvite,'inviter');
  assert.equal(f.data.get('invites/teszt@example.org').role,'Csapattag');
  assert.equal(f.data.get('invites/teszt@example.org').team,'A Firm');
});
test('3. Kapitany mas csapataba nem kuldhet meghivot',async()=>{
  const f=fixture({hasInvite:false});await expectsError(f.invoke('createInvite',{...validInvite,team:'Mas Csapat'},'inviter'),'permission-denied');
});
test('4. Sima szervezo nem hivhat meg csapattagot',async()=>{
  const f=fixture({hasInvite:false,inviterRole:'Szervező'});await expectsError(f.invoke('createInvite',validInvite,'inviter'),'permission-denied');
});
test('5. Inaktiv kapitany nem hozhat letre meghivot',async()=>{
  const f=fixture({hasInvite:false,inviterActive:false});await expectsError(f.invoke('createInvite',validInvite,'inviter'),'permission-denied');
});
test('6. Foszervezo szervezot meghivhat, kapitanyt nem',async()=>{
  const f=fixture({hasInvite:false,inviterRole:'Főszervező'});
  await f.invoke('createInvite',{email:'teszt@example.org',role:'Szervező'},'inviter');
  const g=fixture({hasInvite:false,inviterRole:'Főszervező'});
  await expectsError(g.invoke('createInvite',{email:'uj@example.org',role:'Csapatkapitány'},'inviter'),'permission-denied');
});
test('7. Meglevo ervenyes meghivo nem irhato felul',async()=>{
  const f=fixture();await expectsError(f.invoke('createInvite',validInvite,'inviter'),'already-exists');
});
test('8. Meghivo nelkul nem kezdheto meg meghivasos profil',async()=>{
  const f=fixture({hasInvite:false});await expectsError(f.invoke('prepareInvitedRegistration',{name:'Teszt Elek'}),'not-found');
  assert.equal(f.data.has('users/invitee'),false);
});
test('9. Lejart meghivo nem valthato be',async()=>{
  const f=fixture({expires:Date.now()-10000});
  await expectsError(f.invoke('prepareInvitedRegistration',{name:'Teszt Elek'}),'failed-precondition');
});
test('10. Meghivo utan sem lesz aktiv jogosultsag e-mail-megerosites nelkul',async()=>{
  const f=fixture();const result=await f.invoke('prepareInvitedRegistration',{name:'Teszt Elek'});
  assert.equal(result.status,'pending_email_verification');
  const p=f.data.get('users/invitee');
  assert.equal(p.isVerified,false);assert.notEqual(p.accountStatus,'active');assert.equal(p.role,'Csapattag');
});
test('11. Nem megerositett e-maillel nem valthato be meghivo',async()=>{
  const f=fixture({hasProfile:true});await expectsError(f.invoke('redeemInvite',{name:'Teszt Elek'}),'failed-precondition');
  assert.equal(f.data.get('invites/teszt@example.org').status,'Függőben');
});
test('12. Meghivott emailcim puszta ismerete nem eleg mas emaillel',async()=>{
  const f=fixture({callerEmail:'tamado@example.org',emailVerified:true,hasProfile:false});
  const result=await f.invoke('redeemInvite',{name:'Masik Felhasznalo'});
  assert.equal(result.status,'none');assert.equal(f.data.get('invites/teszt@example.org').status,'Függőben');
  assert.equal(f.data.has('users/invitee'),false);
});
test('13. Megerositett meghivott emaillel sikerul a bevaltas de jovahagyasig inaktiv',async()=>{
  const f=fixture({emailVerified:true,hasProfile:true});
  const result=await f.invoke('redeemInvite',{name:'Teszt Elek'});
  assert.equal(result.status,'accepted');
  const p=f.data.get('users/invitee');
  assert.equal(p.role,'Csapattag');assert.equal(p.isVerified,false);
  assert.notEqual(p.accountStatus,'active');assert.equal(f.data.get('invites/teszt@example.org').status,'Elfogadva');
});
test('14. Ugyanaz a meghivo ketszer nem valthato be',async()=>{
  const f=fixture({emailVerified:true,hasProfile:true});
  await f.invoke('redeemInvite',{name:'Teszt Elek'});
  const again=await f.invoke('redeemInvite',{name:'Teszt Elek'});
  assert.equal(again.status,'none');
});
test('15. Szervezo meghivo csak pendingRole-t ad, nem aktiv jogosultsagot',async()=>{
  const f=fixture({emailVerified:true,hasProfile:true,invitedRole:'Szervező',inviteTeam:''});
  await f.invoke('redeemInvite',{name:'Teszt Elek'});
  const p=f.data.get('users/invitee');assert.equal(p.pendingRole,'Szervező');
  assert.equal(p.role,'Csapattag');assert.equal(p.isVerified,false);assert.notEqual(p.accountStatus,'active');
});
test('16. Fososzervezo szerepkor nem szerezheto meghivoval',async()=>{
  const f=fixture({emailVerified:true,invitedRole:'Főszervező',inviteTeam:''});
  await expectsError(f.invoke('redeemInvite',{name:'Teszt Elek'}),'failed-precondition');
});
test.todo('Kulon, egyszer hasznalhato, lejarato meghivo-token kell a regisztracios linkbe');
test.todo('Idegen e-mail-cimre ne lehessen Firebase Auth fiokot lefoglalni a meghivo ellenorzese elott');
