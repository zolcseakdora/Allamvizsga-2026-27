import { createHash, randomBytes } from 'node:crypto';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';

const app = getApps().length === 0 ? initializeApp() : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

const HEAD_ORGANIZER = 'Főszervező';
const ORGANIZER = 'Szervező';
const JURY = 'Zsűri';
const CAPTAIN = 'Csapatkapitány';
const DEPUTY_CAPTAIN = 'Alcsapatkapitány';
const TEAM_MEMBER = 'Csapattag';
const INVITE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

type Profile = Record<string, unknown> & {
  role?: unknown;
  team?: unknown;
  accountStatus?: unknown;
  isVerified?: unknown;
  isDisabled?: unknown;
};

function requireUid(request: CallableRequest<unknown>) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
  return uid;
}

function requiredString(value: unknown, label: string, maxLength = 200) {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `Érvénytelen ${label}.`);
  }
  const result = value.trim();
  if (!result || result.length > maxLength) {
    throw new HttpsError('invalid-argument', `Érvénytelen ${label}.`);
  }
  return result;
}

function normalizeTeamName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function profileIsActive(profile: Profile) {
  if (profile.isDisabled === true || profile.accountStatus === 'disabled') return false;
  if (typeof profile.accountStatus === 'string') return profile.accountStatus === 'active';
  return profile.isVerified === true || profile.role === HEAD_ORGANIZER;
}

function assertHeadOrganizer(profile: Profile | undefined) {
  if (!profile) throw new HttpsError('permission-denied', 'Nincs felhasználói profil.');
  if (profile.role !== HEAD_ORGANIZER || !profileIsActive(profile)) {
    throw new HttpsError('permission-denied', 'Ezt a műveletet csak aktív főszervező végezheti.');
  }
}

function hashCode(code: string) {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

function validTeamName(value: string) {
  const teamName = normalizeTeamName(value);
  if (teamName.length < 2 || teamName.length > 80 || teamName.includes('/')) {
    throw new HttpsError('invalid-argument', 'A csapatnév 2–80 karakter lehet, és nem tartalmazhat perjelet.');
  }
  return teamName;
}

function validEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Érvénytelen e-mail-cím.');
  }
  return email;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

// Csak tényleges HTTPS telepítési / regisztrációs címeket engedünk az e-mailbe.
// A két cím a Firebase Functions környezeti változóiból érkezik.
function configuredHttpsUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') {
      throw new Error('https');
    }
    return url.toString();
  } catch {
    throw new HttpsError('failed-precondition', 'Az MMDSZ telepítési/regisztrációs link érvénytelen.');
  }
}

export const createCaptainRegistrationCode = onCall(async (request) => {
  const uid = requireUid(request);

  const code = `MMDSZ-${randomBytes(24).toString('base64url')}`;
  const codeHash = hashCode(code);
  const now = Timestamp.now();
  const profileRef = db.collection('users').doc(uid);
  await db.runTransaction(async (transaction) => {
    const profileSnapshot = await transaction.get(profileRef);
    assertHeadOrganizer(profileSnapshot.exists ? profileSnapshot.data() as Profile : undefined);
    transaction.create(db.collection('captain_registration_codes').doc(codeHash), {
      status: 'available',
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now.toMillis() + INVITE_LIFETIME_MS),
    });
  });

  return { code, expiresAt: Timestamp.fromMillis(now.toMillis() + INVITE_LIFETIME_MS).toDate().toISOString() };
});

export const requestCaptainRegistration = onCall(async (request) => {
  const uid = requireUid(request);
  const email = request.auth?.token.email;
  if (typeof email !== 'string') {
    throw new HttpsError('failed-precondition', 'A regisztrációhoz e-mail-cím szükséges.');
  }

  const code = requiredString(request.data?.code, 'regisztrációs kód', 100);
  const name = requiredString(request.data?.name, 'név', 120);
  const teamName = validTeamName(requiredString(request.data?.teamName, 'csapatnév', 80));
  const codeHash = hashCode(code);
  const codeRef = db.collection('captain_registration_codes').doc(codeHash);
  const registrationRef = db.collection('captain_registrations').doc(uid);
  const profileRef = db.collection('users').doc(uid);
  const emailAddress = validEmail(email);

  await db.runTransaction(async (transaction) => {
    const [codeSnapshot, registrationSnapshot, profileSnapshot] = await Promise.all([
      transaction.get(codeRef),
      transaction.get(registrationRef),
      transaction.get(profileRef),
    ]);

    if (
      registrationSnapshot.exists
      && registrationSnapshot.get('status') === 'pending'
      && registrationSnapshot.get('codeHash') === codeHash
    ) {
      return;
    }
    if (profileSnapshot.exists || registrationSnapshot.exists) {
      throw new HttpsError('already-exists', 'Ehhez a fiókhoz már tartozik regisztráció vagy profil.');
    }
    if (!codeSnapshot.exists || codeSnapshot.get('status') !== 'available') {
      throw new HttpsError('failed-precondition', 'A regisztrációs kód érvénytelen vagy már felhasznált.');
    }
    const expiresAt = codeSnapshot.get('expiresAt') as Timestamp | undefined;
    if (!expiresAt || expiresAt.toMillis() <= Date.now()) {
      throw new HttpsError('failed-precondition', 'A regisztrációs kód lejárt.');
    }

    const now = FieldValue.serverTimestamp();
    transaction.update(codeRef, {
      status: 'redeemed',
      redeemedBy: uid,
      redeemedAt: now,
    });
    transaction.create(registrationRef, {
      uid,
      name,
      email: emailAddress,
      teamName,
      status: 'pending',
      codeHash,
      createdAt: now,
    });
    transaction.create(profileRef, {
      name,
      email: emailAddress,
      team: '',
      role: TEAM_MEMBER,
      isVerified: false,
      accountStatus: 'pending_captain_approval',
      membershipStatus: 'pending_captain_approval',
      requestedTeamName: teamName,
      createdAt: now,
    });
  });

  return { status: 'pending_captain_approval' };
});

export const reviewCaptainRegistration = onCall(async (request) => {
  const reviewerUid = requireUid(request);

  const uid = requiredString(request.data?.uid, 'felhasználó-azonosító', 128);
  const approved = request.data?.approved;
  if (typeof approved !== 'boolean') {
    throw new HttpsError('invalid-argument', 'A jóváhagyás állapota kötelező.');
  }
  // Jogosultság-ellenőrzés még az előtt, hogy a célfelhasználó Firebase Auth-adatát lekérnénk.
  const initialReviewerSnapshot = await db.collection('users').doc(reviewerUid).get();
  assertHeadOrganizer(initialReviewerSnapshot.exists ? initialReviewerSnapshot.data() as Profile : undefined);
  if (approved) {
    const authUser = await auth.getUser(uid);
    if (!authUser.emailVerified) {
      throw new HttpsError('failed-precondition', 'A kapitány e-mail-címét előbb meg kell erősíteni.');
    }
  }

  const registrationRef = db.collection('captain_registrations').doc(uid);
  const profileRef = db.collection('users').doc(uid);
  const reviewerProfileRef = db.collection('users').doc(reviewerUid);

  await db.runTransaction(async (transaction) => {
    const [reviewerSnapshot, registrationSnapshot, profileSnapshot] = await Promise.all([
      transaction.get(reviewerProfileRef),
      transaction.get(registrationRef),
      transaction.get(profileRef),
    ]);
    assertHeadOrganizer(reviewerSnapshot.exists ? reviewerSnapshot.data() as Profile : undefined);
    if (!registrationSnapshot.exists || !profileSnapshot.exists) {
      throw new HttpsError('not-found', 'A kapitányi jelentkezés nem található.');
    }
    if (registrationSnapshot.get('status') !== 'pending') {
      throw new HttpsError('failed-precondition', 'A jelentkezést már elbírálták.');
    }
    if (
      profileSnapshot.get('accountStatus') !== 'pending_captain_approval'
      || profileSnapshot.get('membershipStatus') !== 'pending_captain_approval'
    ) {
      throw new HttpsError('failed-precondition', 'A kapitányi fiók állapota már megváltozott.');
    }
    if (approved && (
      typeof profileSnapshot.get('igazolas') !== 'string'
      || !(profileSnapshot.get('igazolas') as string).trim()
    )) {
      throw new HttpsError('failed-precondition', 'Kapitány jóváhagyásához feltöltött diákigazolvány szükséges.');
    }
    const teamName = validTeamName(requiredString(registrationSnapshot.get('teamName'), 'csapatnév', 80));
    const teamRef = db.collection('teams').doc(teamName);
    const teamSnapshot = await transaction.get(teamRef);
    if (approved && teamSnapshot.exists) {
      throw new HttpsError('already-exists', 'Ilyen nevű csapat már létezik.');
    }

    const now = FieldValue.serverTimestamp();
    if (approved) {
      transaction.create(teamRef, {
        name: teamName,
        nameKey: teamName.toLowerCase(),
        createdAt: now,
        createdBy: uid,
      });
      transaction.update(profileRef, {
        role: CAPTAIN,
        team: teamName,
        isVerified: true,
        accountStatus: 'active',
        membershipStatus: 'active',
        requestedTeamName: FieldValue.delete(),
        approvedAt: now,
        approvedBy: reviewerUid,
      });
      transaction.update(registrationRef, {
        status: 'approved',
        reviewedAt: now,
        reviewedBy: reviewerUid,
      });
    } else {
      transaction.update(profileRef, {
        accountStatus: 'rejected',
        membershipStatus: 'rejected',
        requestedTeamName: FieldValue.delete(),
        rejectedAt: now,
        rejectedBy: reviewerUid,
      });
      transaction.update(registrationRef, {
        status: 'rejected',
        reviewedAt: now,
        reviewedBy: reviewerUid,
      });
    }
  });

  return { status: approved ? 'approved' : 'rejected' };
});

export const createInvite = onCall(async (request) => {
  const uid = requireUid(request);
  const email = validEmail(requiredString(request.data?.email, 'e-mail-cím', 254));
  const role = requiredString(request.data?.role, 'szerepkör', 60);
  const teamName = typeof request.data?.team === 'string'
    ? normalizeTeamName(request.data.team)
    : '';

  const appUrl = configuredHttpsUrl(process.env.MMDSZ_APP_URL);
  const installUrl = configuredHttpsUrl(process.env.MMDSZ_INSTALL_URL);
  if (!appUrl && !installUrl) {
    throw new HttpsError(
      'failed-precondition',
      'Előbb állítsd be a Firebase Functions MMDSZ_APP_URL vagy MMDSZ_INSTALL_URL címét.'
    );
  }
  const registrationUrl = appUrl ? new URL('/auth?invite=1', appUrl).toString() : undefined;

  const inviteRef = db.collection('invites').doc(email);
  const inviterRef = db.collection('users').doc(uid);
  const mailRef = db.collection('mail').doc();
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + INVITE_LIFETIME_MS);

  await db.runTransaction(async (transaction) => {
    const [inviterSnapshot, existingInvite] = await Promise.all([
      transaction.get(inviterRef),
      transaction.get(inviteRef),
    ]);
    const profile = inviterSnapshot.exists ? inviterSnapshot.data() as Profile : undefined;
    if (!profile || !profileIsActive(profile)) {
      throw new HttpsError('permission-denied', 'Csak aktív felhasználó küldhet meghívót.');
    }
    if (profile.role === HEAD_ORGANIZER) {
      if (![ORGANIZER, JURY].includes(role)) {
        throw new HttpsError('permission-denied', 'A főszervező ezen a felületen szervezőt vagy zsűrit hívhat meg.');
      }
    } else if (profile.role === CAPTAIN || profile.role === DEPUTY_CAPTAIN) {
      if (![TEAM_MEMBER, DEPUTY_CAPTAIN].includes(role) || !teamName || teamName !== profile.team) {
        throw new HttpsError('permission-denied', 'Kapitány csak saját csapatába hívhat csapattagot vagy alkapitányt.');
      }
    } else {
      throw new HttpsError('permission-denied', 'Nincs jogosultság meghívó létrehozásához.');
    }

    const existingExpiresAt = existingInvite.get('expiresAt') as Timestamp | undefined;
    if (
      existingInvite.exists
      && existingInvite.get('status') === 'Függőben'
      && existingExpiresAt
      && existingExpiresAt.toMillis() > now.toMillis()
    ) {
      throw new HttpsError('already-exists', 'Ehhez az e-mail-címhez már van érvényes meghívó.');
    }

    const team = profile.role === HEAD_ORGANIZER ? '' : teamName;
    const escapedTeam = escapeHtml(team);
    const escapedRole = escapeHtml(role);
    const registrationLinkHtml = registrationUrl
      ? `<p><a href="${escapeHtml(registrationUrl)}">Regisztráció az MMDSZ alkalmazásba</a></p>` : '';
    const installLinkHtml = installUrl
      ? `<p><a href="${escapeHtml(installUrl)}">MMDSZ alkalmazás letöltése</a></p>` : '';
    const textLinks = [
      registrationUrl ? `Regisztráció: ${registrationUrl}` : undefined,
      installUrl ? `Alkalmazás letöltése: ${installUrl}` : undefined,
    ].filter(Boolean).join('\n');
    transaction.set(inviteRef, {
      email,
      team,
      role,
      status: 'Függőben',
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });
    transaction.create(mailRef, {
      to: email,
      message: {
        subject: 'MMDSZ alkalmazás – meghívó',
        text: `Meghívást kaptál az MMDSZ alkalmazásba. Szerepkör: ${role}.${team ? ` Csapat: ${team}.` : ''}\n` +
          `A meghívó 30 napig érvényes. Az e-mail-cím megerősítése és a főszervező jóváhagyása kötelező.\n` +
          `${textLinks}\nAz alkalmazásban válaszd a „Meghívóval regisztrálok” lehetőséget.`,
        html: `<p>Meghívást kaptál az MMDSZ alkalmazásba${escapedTeam ? ` a(z) <strong>${escapedTeam}</strong> csapatba` : ''}, <strong>${escapedRole}</strong> szerepkörbe.</p>` +
          `${installLinkHtml}${registrationLinkHtml}` +
          `<p>A meghívó 30 napig érvényes. Ugyanazzal az e-mail-címmel regisztrálj, erősítsd meg az e-mail-címed, majd várd meg a főszervező jóváhagyását.</p>`,
      },
    });
  });

  return { status: 'sent', expiresAt: expiresAt.toDate().toISOString() };
});

// Meghívott regisztrációjának indulása. A profil ilyenkor még SEMMILYEN
// meghívott szerepkört nem kap, és nem szerepel a jóváhagyható kérelmek között.
// A meghívó csak MEGERŐSÍTETT e-mail után váltható be a redeemInvite függvénnyel.
export const prepareInvitedRegistration = onCall(async (request) => {
  const uid = requireUid(request);
  const emailValue = request.auth?.token.email;
  if (typeof emailValue !== 'string') {
    throw new HttpsError('failed-precondition', 'E-mail-cím szükséges a regisztrációhoz.');
  }
  const email = validEmail(emailValue);
  const name = requiredString(request.data?.name, 'név', 120);
  const inviteRef = db.collection('invites').doc(email);
  const profileRef = db.collection('users').doc(uid);

  await db.runTransaction(async (transaction) => {
    const [inviteSnapshot, profileSnapshot] = await Promise.all([
      transaction.get(inviteRef),
      transaction.get(profileRef),
    ]);
    if (!inviteSnapshot.exists || inviteSnapshot.get('status') !== 'Függőben') {
      throw new HttpsError('not-found', 'Ehhez az e-mail-címhez nincs érvényes meghívó.');
    }
    const expiresAt = inviteSnapshot.get('expiresAt') as Timestamp | undefined;
    if (!expiresAt || expiresAt.toMillis() <= Date.now()) {
      throw new HttpsError('failed-precondition', 'A meghívó lejárt.');
    }
    if (profileSnapshot.exists) {
      if (profileSnapshot.get('accountStatus') === 'pending_email_verification'
        && profileSnapshot.get('email') === email) return;
      throw new HttpsError('already-exists', 'Ehhez a fiókhoz már tartozik profil.');
    }
    // Az előzetes pendingRole CSAK megjelenítési adat, nem aktív jogosultság.
    // A végleges szerepkört a meghívó újbóli, e-mail utáni beváltásakor állítjuk.
    const invitedRole = inviteSnapshot.get('role');
    if (![TEAM_MEMBER, DEPUTY_CAPTAIN, ORGANIZER, JURY].includes(invitedRole as string)) {
      throw new HttpsError('failed-precondition', 'A meghívó szerepköre érvénytelen.');
    }
    transaction.create(profileRef, {
      name,
      email,
      team: '',
      role: TEAM_MEMBER,
      pendingRole: invitedRole,
      isVerified: false,
      accountStatus: 'pending_email_verification',
      membershipStatus: 'pending_email_verification',
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { status: 'pending_email_verification' };
});

export const redeemInvite = onCall(async (request) => {
  const uid = requireUid(request);
  const emailValue = request.auth?.token.email;
  if (request.auth?.token.email_verified !== true || typeof emailValue !== 'string') {
    throw new HttpsError('failed-precondition', 'A meghívó beváltásához megerősített e-mail-cím szükséges.');
  }
  const email = validEmail(emailValue);
  const name = typeof request.data?.name === 'string'
    ? requiredString(request.data.name, 'név', 120)
    : '';
  const inviteRef = db.collection('invites').doc(email);
  const profileRef = db.collection('users').doc(uid);

  const result = await db.runTransaction(async (transaction) => {
    const [inviteSnapshot, profileSnapshot] = await Promise.all([
      transaction.get(inviteRef),
      transaction.get(profileRef),
    ]);
    if (!inviteSnapshot.exists || inviteSnapshot.get('status') !== 'Függőben') {
      return { status: 'none' as const };
    }

    const expiresAt = inviteSnapshot.get('expiresAt') as Timestamp | undefined;
    if (!expiresAt || expiresAt.toMillis() <= Date.now()) {
      throw new HttpsError('failed-precondition', 'A meghívó lejárt.');
    }

    const role = inviteSnapshot.get('role');
    if (![TEAM_MEMBER, DEPUTY_CAPTAIN, ORGANIZER, JURY].includes(role as string)) {
      throw new HttpsError('failed-precondition', 'A meghívó szerepköre érvénytelen.');
    }
    const invitedTeam = typeof inviteSnapshot.get('team') === 'string'
      ? normalizeTeamName(inviteSnapshot.get('team') as string)
      : '';
    if ((role === TEAM_MEMBER || role === DEPUTY_CAPTAIN) && !invitedTeam) {
      throw new HttpsError('failed-precondition', 'A meghívóból hiányzik a csapat.');
    }

    const profile = profileSnapshot.exists ? profileSnapshot.data() as Profile : undefined;
    if (!profile && !name) {
      throw new HttpsError('invalid-argument', 'A regisztrációhoz név szükséges.');
    }
    if (profile) {
      const existingTeam = typeof profile.team === 'string' ? normalizeTeamName(profile.team) : '';
      if (
        profile.isDisabled === true
        || profile.accountStatus === 'disabled'
        || (existingTeam && existingTeam.toLowerCase() !== 'egyéni')
        || (profile.membershipStatus
          && profile.membershipStatus !== 'rejected'
          && profile.membershipStatus !== 'pending_email_verification')
        || (profile.role && profile.role !== TEAM_MEMBER)
      ) {
        throw new HttpsError('failed-precondition', 'A fiók már másik csapathoz tartozik vagy nem jogosult meghívó beváltására.');
      }
    }

    const pendingRole = role === TEAM_MEMBER ? undefined : role;
    const membershipStatus = role === TEAM_MEMBER
      ? 'pending_verification'
      : role === DEPUTY_CAPTAIN
        ? 'pending_admin_approval'
        : 'pending_admin_activation';
    const now = FieldValue.serverTimestamp();
    const profileData: Record<string, unknown> = {
      email,
      team: invitedTeam,
      role: TEAM_MEMBER,
      isVerified: false,
      accountStatus: membershipStatus,
      membershipStatus,
      updatedAt: now,
      ...(name ? { name } : {}),
      ...(pendingRole ? { pendingRole } : {}),
      ...(!pendingRole ? { pendingRole: FieldValue.delete() } : {}),
      ...(!profileSnapshot.exists ? { createdAt: now } : {}),
    };

    transaction.set(profileRef, profileData, { merge: true });
    transaction.update(inviteRef, {
      status: 'Elfogadva',
      acceptedBy: uid,
      acceptedAt: now,
    });
    return { status: 'accepted' as const, team: invitedTeam };
  });

  return result;
});

export const reviewPendingMembership = onCall(async (request) => {
  const reviewerUid = requireUid(request);

  const uid = requiredString(request.data?.uid, 'felhasználó-azonosító', 128);
  const approved = request.data?.approved;
  if (typeof approved !== 'boolean') {
    throw new HttpsError('invalid-argument', 'A jóváhagyás állapota kötelező.');
  }
  // A jogosultságot a célfelhasználó Firebase Auth-lekérése előtt is ellenőrizzük.
  const initialReviewerSnapshot = await db.collection('users').doc(reviewerUid).get();
  assertHeadOrganizer(initialReviewerSnapshot.exists ? initialReviewerSnapshot.data() as Profile : undefined);
  const authUser = approved ? await auth.getUser(uid) : undefined;
  if (authUser && !authUser.emailVerified) {
    throw new HttpsError('failed-precondition', 'A felhasználó e-mail-címét előbb meg kell erősíteni.');
  }

  const profileRef = db.collection('users').doc(uid);
  const reviewerProfileRef = db.collection('users').doc(reviewerUid);
  await db.runTransaction(async (transaction) => {
    const [reviewerSnapshot, profileSnapshot] = await Promise.all([
      transaction.get(reviewerProfileRef),
      transaction.get(profileRef),
    ]);
    assertHeadOrganizer(reviewerSnapshot.exists ? reviewerSnapshot.data() as Profile : undefined);
    if (!profileSnapshot.exists) throw new HttpsError('not-found', 'A felhasználói profil nem található.');
    const profile = profileSnapshot.data() as Profile & { membershipStatus?: unknown; pendingRole?: unknown };
    const allowedStatuses = ['pending_verification', 'pending_admin_approval', 'pending_admin_activation'];
    if (!allowedStatuses.includes(profile.membershipStatus as string)) {
      throw new HttpsError('failed-precondition', 'A felhasználó nem vár jóváhagyásra.');
    }
    if (approved && (profile.accountStatus === 'disabled' || profile.isDisabled === true)) {
      throw new HttpsError('failed-precondition', 'Letiltott felhasználót nem lehet aktiválni.');
    }

    const now = FieldValue.serverTimestamp();
    if (!approved) {
      transaction.update(profileRef, {
        team: '',
        pendingRole: FieldValue.delete(),
        accountStatus: 'rejected',
        membershipStatus: 'rejected',
        isVerified: false,
        rejectedAt: now,
        rejectedBy: reviewerUid,
      });
      return;
    }

    const pendingRole = profile.pendingRole;
    const role = typeof pendingRole === 'string' ? pendingRole : TEAM_MEMBER;
    if (![TEAM_MEMBER, DEPUTY_CAPTAIN, ORGANIZER, JURY].includes(role)) {
      throw new HttpsError('failed-precondition', 'A kért szerepkör érvénytelen.');
    }
    // A csapattag és az alkapitány egyaránt csak diákigazolvánnyal aktiválható.
    // A szervező és a zsűri meghívásához nem kérünk ilyen igazolást.
    if ((role === TEAM_MEMBER || role === DEPUTY_CAPTAIN)
      && (typeof profile.igazolas !== 'string' || !profile.igazolas.trim())) {
      throw new HttpsError('failed-precondition', 'Csapattag vagy alkapitány jóváhagyásához igazolás szükséges.');
    }
    transaction.update(profileRef, {
      role,
      pendingRole: FieldValue.delete(),
      accountStatus: 'active',
      membershipStatus: 'active',
      isVerified: true,
      approvedAt: now,
      approvedBy: reviewerUid,
    });
  });

  return { status: approved ? 'approved' : 'rejected' };
});
