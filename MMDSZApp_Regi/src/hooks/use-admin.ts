import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc, writeBatch } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useCallback, useState } from 'react';

import { auth, db, functions } from '@/src/config/firebase';
import { useAuth } from '@/src/context/AuthContext';
import { createNotification } from '@/src/services/notifications';
import type { NotificationAudience } from '@/src/services/notifications';
import {
  assignFebrutalisTeamCaptain as assignFebrutalisTeamCaptainCall,
  listFebrutalisRegistrations,
} from '@/src/services/event-admin';
import { UserRole } from '@/src/types/auth';
import { normalizeTeamName } from '@/src/utils/team-name';
import { isRegistrationReviewPending } from '@/src/utils/registration-review';
import type { Team } from '@/src/types/team';
import type { EventSeason } from '@/src/constants/event-schedule';

export type RegisteredUser = {
  id: string;
  name?: string;
  role?: UserRole;
  igazolas?: string;
  email?: string;
  requestedTeamName?: string;
  pendingRole?: UserRole;
  accountStatus?: string;
  membershipStatus?: string;
  teamName?: string;
  teamKey?: string;
  isVerified?: boolean;
  isFebrutalisCaptain?: boolean;
};

export type PendingUser = {
  id: string;
  name?: string;
  role?: UserRole;
  email?: string;
  team?: string;
  isVerified: boolean;
  accountStatus?: string;
  igazolas: string;
  eventType: EventSeason;
  isLegacy: boolean;
};

function toTeam(id: string, data: Record<string, unknown>): Team {
  return {
    id,
    eventType: data.eventType === 'februtalis' || data.eventType === 'diaknapok'
      ? data.eventType
      : undefined,
    name: typeof data.name === 'string' ? data.name : undefined,
    captainUid: typeof data.captainUid === 'string' ? data.captainUid : undefined,
    logo: typeof data.logo === 'string' ? data.logo : undefined,
    flag: typeof data.flag === 'string' ? data.flag : undefined,
    description: typeof data.description === 'string' ? data.description : undefined,
    videoLink: typeof data.videoLink === 'string' ? data.videoLink : undefined,
  };
}

function toUserRole(value: unknown): UserRole | undefined {
  return Object.values(UserRole).find((role) => role === value);
}

export function useAdmin() {
  const { user, profile } = useAuth();
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const requireHeadOrganizer = useCallback(() => {
    if (profile?.role !== UserRole.FOSZERVEZO) {
      throw new Error('Only a head organizer can manage teams');
    }
  }, [profile?.role]);

  const refreshTeams = useCallback(async (eventType: EventSeason = 'diaknapok') => {
    const snapshot = await getDocs(collection(db, 'teams'));
    setTeams(snapshot.docs
      .filter((item) => (
        eventType === 'februtalis'
          ? item.data().eventType === 'februtalis'
          : item.data().eventType === undefined || item.data().eventType === 'diaknapok'
      ))
      .map((item) => toTeam(item.id, item.data())));
  }, []);

  const deleteTeam = useCallback(async (teamId: string, eventType: EventSeason = 'diaknapok') => {
    requireHeadOrganizer();
    await deleteDoc(doc(db, 'teams', teamId));
    await refreshTeams(eventType);
  }, [refreshTeams, requireHeadOrganizer]);

  const normalizeUserTeamNames = useCallback(async () => {
    requireHeadOrganizer();
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const updates = usersSnapshot.docs.flatMap((item) => {
      const value: unknown = item.data().team;
      if (typeof value !== 'string') return [];
      const team = normalizeTeamName(value);
      return team !== value ? [{ id: item.id, team }] : [];
    });

    for (let start = 0; start < updates.length; start += 450) {
      const batch = writeBatch(db);
      updates.slice(start, start + 450).forEach(({ id, team }) => {
        batch.update(doc(db, 'users', id), { team });
      });
      await batch.commit();
    }
    return updates.length;
  }, [requireHeadOrganizer]);

  const refreshRegisteredUsers = useCallback(async (eventType: EventSeason = 'diaknapok') => {
    if (eventType === 'februtalis') {
      let registrations;
      try {
        registrations = await listFebrutalisRegistrations();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Februtális registrations request failed: ${message}`);
      }
      const users = await Promise.all(registrations.map(async (registration): Promise<RegisteredUser | null> => {
        const registrationData = registration;
        const uid = registrationData.uid;
        if (typeof uid !== 'string') return null;
        let userSnapshot;
        try {
          userSnapshot = await getDoc(doc(db, 'users', uid));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`users profile lookup failed: ${message}`);
        }
        if (!userSnapshot.exists()) return null;
        const data = userSnapshot.data();
        const role = toUserRole(data.role);
        const memberships = data.eventMemberships;
        const februtalisMembership = memberships && typeof memberships === 'object'
          ? (memberships as Record<string, unknown>).februtalis
          : undefined;
        const membershipData = februtalisMembership && typeof februtalisMembership === 'object'
          ? februtalisMembership as Record<string, unknown>
          : undefined;
        if (
          role === UserRole.SZERVEZO
          || role === UserRole.ZSURI
          || role === UserRole.FOSZERVEZO
          || membershipData?.role === UserRole.SZERVEZO
          || membershipData?.role === UserRole.ZSURI
        ) {
          return null;
        }
        const verification = data.eventVerifications;
        const februtalisVerification = verification && typeof verification === 'object'
          ? (verification as Record<string, unknown>).februtalis
          : undefined;
        const diaknapokVerification = verification && typeof verification === 'object'
          ? (verification as Record<string, unknown>).diaknapok
          : undefined;
        const verificationData = februtalisVerification && typeof februtalisVerification === 'object'
          ? februtalisVerification as Record<string, unknown>
          : undefined;
        const diaknapokVerificationData = diaknapokVerification && typeof diaknapokVerification === 'object'
          ? diaknapokVerification as Record<string, unknown>
          : undefined;
        return {
          id: uid,
          name: typeof data.name === 'string' ? data.name : undefined,
          role,
          igazolas: typeof verificationData?.imageUrl === 'string'
            ? verificationData.imageUrl
            : data.isVerified === true
              ? typeof data.igazolas === 'string'
                ? data.igazolas
                : typeof diaknapokVerificationData?.imageUrl === 'string'
                  ? diaknapokVerificationData.imageUrl
                  : undefined
              : undefined,
          teamName: typeof registrationData.teamName === 'string'
            ? registrationData.teamName
            : undefined,
          teamKey: typeof registrationData.teamKey === 'string'
            ? registrationData.teamKey
            : undefined,
          isVerified: data.isVerified === true,
          isFebrutalisCaptain: membershipData?.role === UserRole.CSAPATKAPITANY,
        };
      }));
      setRegisteredUsers(users.filter((item): item is RegisteredUser => item !== null));
      return;
    }

    let snapshot;
    try {
      snapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`users query failed: ${message}`);
    }
    setRegisteredUsers(snapshot.docs.map((item) => {
      const data = item.data();
      return { id: item.id, ...data, role: toUserRole(data.role), pendingRole: toUserRole(data.pendingRole) } as RegisteredUser;
    }));
  }, []);

  const refreshPendingUsers = useCallback(async (eventType: EventSeason = 'diaknapok') => {
    const snapshot = await getDocs(collection(db, 'users'));
    const pending: PendingUser[] = [];
    const pendingStatuses = new Set([
      'pending_captain_approval', 'pending_verification',
      'pending_admin_approval', 'pending_admin_activation',
    ]);
    snapshot.docs.forEach((item) => {
      const data = item.data();
      const accountStatus = typeof data.accountStatus === 'string' ? data.accountStatus : undefined;
      const membershipStatus = typeof data.membershipStatus === 'string' ? data.membershipStatus : undefined;
      const eventVerifications = data.eventVerifications;
      const verification = eventVerifications && typeof eventVerifications === 'object'
        ? (eventVerifications as Record<string, unknown>)[eventType]
        : undefined;
      const verificationData = verification && typeof verification === 'object'
        ? verification as Record<string, unknown>
        : undefined;
      const isEventVerification = typeof verificationData?.imageUrl === 'string'
        && !!verificationData.imageUrl.trim();
      // Diáknapok: a szerveroldali regisztrációs jóváhagyásra váró profilok.
      const isRegistrationPending = eventType === 'diaknapok' && (
        (accountStatus !== undefined && pendingStatuses.has(accountStatus))
        || (membershipStatus !== undefined && pendingStatuses.has(membershipStatus))
      );
      // Régi, accountStatus nélküli profilok, amelyeknél még nincs jóváhagyva az igazolás.
      const isLegacy = !isEventVerification
        && !isRegistrationPending
        && eventType === 'diaknapok'
        && !accountStatus
        && !membershipStatus
        && data.isVerified !== true
        && typeof data.igazolas === 'string'
        && !!data.igazolas.trim();
      if (!isEventVerification && !isRegistrationPending && !isLegacy) return;
      if (isRegistrationPending) {
        // Az igazolas-nezoben csak valoban feltoltott diakigazolvanyok vannak.
        const requestedRole = toUserRole(data.pendingRole) ?? toUserRole(data.role);
        if (requestedRole === UserRole.SZERVEZO || requestedRole === UserRole.ZSURI) return;
      }
      const imageUrl = isEventVerification
        ? verificationData.imageUrl as string
        : typeof data.igazolas === 'string' && data.igazolas.trim()
          ? data.igazolas
          : undefined;
      if (!imageUrl) return;

      const isCaptainApplication = accountStatus === 'pending_captain_approval'
        || membershipStatus === 'pending_captain_approval';
      pending.push({
        id: item.id,
        name: typeof data.name === 'string' ? data.name : undefined,
        role: isCaptainApplication
          ? UserRole.CSAPATKAPITANY
          : toUserRole(data.pendingRole) ?? toUserRole(data.role),
        email: typeof data.email === 'string' ? data.email : undefined,
        team: isCaptainApplication && typeof data.requestedTeamName === 'string'
          ? data.requestedTeamName
          : typeof data.team === 'string' ? data.team : undefined,
        isVerified: isRegistrationPending
          ? false
          : isEventVerification
            ? verificationData.status === 'approved'
            : data.isVerified === true,
        accountStatus,
        igazolas: imageUrl,
        eventType,
        isLegacy,
      });
    });
    setPendingUsers(pending);
  }, []);

  const approveUser = useCallback(async (
    userId: string,
    eventType: EventSeason,
    isLegacy: boolean,
  ) => {
    requireHeadOrganizer();
    const userRef = doc(db, 'users', userId);
    const userSnapshot = await getDoc(userRef);
    if (!userSnapshot.exists()) throw new Error('The user profile no longer exists');
    const data = userSnapshot.data();
    const accountStatus: unknown = data.accountStatus;
    const membershipStatus: unknown = data.membershipStatus;
    const status = typeof accountStatus === 'string' ? accountStatus : membershipStatus;
    if (eventType === 'diaknapok' && status === 'pending_captain_approval') {
      // Diáknapok kapitányi jelentkezés: a szerepkört csak a szerver adhatja meg.
      const reviewCaptainRegistration = httpsCallable<
        { uid: string; approved: boolean }, { status: string }
      >(functions, 'reviewCaptainRegistration');
      await reviewCaptainRegistration({ uid: userId, approved: true });
    } else if (eventType === 'diaknapok' && (status === 'pending_verification'
      || status === 'pending_admin_approval'
      || status === 'pending_admin_activation')) {
      const reviewPendingMembership = httpsCallable<
        { uid: string; approved: boolean }, { status: string }
      >(functions, 'reviewPendingMembership');
      await reviewPendingMembership({ uid: userId, approved: true });
    } else {
      // Eseményenkénti igazolás (FebruTális / Diáknapok) vagy régi, accountStatus nélküli profil.
      // A Firestore-szabály ezt is csak főszervezőnek engedi.
      const updates: Record<string, unknown> = { isVerified: true };
      if (!isLegacy) updates[`eventVerifications.${eventType}.status`] = 'approved';
      await updateDoc(userRef, updates);
    }
    await refreshPendingUsers(eventType);
  }, [refreshPendingUsers, requireHeadOrganizer]);

  // Regisztracio elbiralasa: a tenyleges szerepkort csak a Firebase Functions allitja be.
  const reviewRegistration = useCallback(async (userId: string, approved: boolean) => {
    requireHeadOrganizer();
    const userRef = doc(db, 'users', userId);
    const userSnapshot = await getDoc(userRef);
    if (!userSnapshot.exists()) throw new Error('A felhasznaloi profil nem talalhato.');
    const data = userSnapshot.data();
    if (!isRegistrationReviewPending(data)) throw new Error('A felhasznalo nem var regisztracios jovahagyasra.');
    const status = data.accountStatus === 'pending_captain_approval'
      || data.membershipStatus === 'pending_captain_approval'
      ? 'pending_captain_approval'
      : data.accountStatus ?? data.membershipStatus;
    if (status === 'pending_captain_approval') {
      const reviewCaptainRegistration = httpsCallable<{ uid: string; approved: boolean }, { status: string }>(functions, 'reviewCaptainRegistration');
      await reviewCaptainRegistration({ uid: userId, approved });
    } else if (['pending_verification', 'pending_admin_approval', 'pending_admin_activation'].includes(status)) {
      const reviewPendingMembership = httpsCallable<{ uid: string; approved: boolean }, { status: string }>(functions, 'reviewPendingMembership');
      await reviewPendingMembership({ uid: userId, approved });
    } else {
      throw new Error('A regisztracio nem elbiralhato.');
    }
    await Promise.all([refreshRegisteredUsers(), refreshPendingUsers()]);
  }, [requireHeadOrganizer, refreshRegisteredUsers, refreshPendingUsers]);
  const assignFebrutalisTeamCaptain = useCallback(async (teamKey: string, captainUid: string) => {
    requireHeadOrganizer();
    return assignFebrutalisTeamCaptainCall(teamKey, captainUid);
  }, [requireHeadOrganizer]);

  const addEvent = useCallback(async (
    event: {
      id?: string;
      title: string;
      time: string;
      location: string;
      day: string;
      description?: string;
      image?: { image: string; thumb: string };
    },
  ) => {
    const eventId = event.id ?? doc(collection(db, 'programs')).id;
    const batch = writeBatch(db);
    const programData = {
      title: event.title.trim(),
      time: event.time.trim(),
      helyszín: event.location.trim(),
      day: event.day,
      description: event.description?.trim() || '',
      ...(event.image ? { thumb: event.image.thumb } : {}),
      ...(!event.id ? { createdAt: new Date(), createdBy: auth.currentUser?.uid } : {}),
    };

    batch.set(doc(db, 'programs', eventId), programData, { merge: true });
    if (event.image) {
      batch.set(doc(db, 'program_images', eventId), { image: event.image.image });
    }
    await batch.commit();
    return eventId;
  }, []);

  const sendNotification = useCallback(async (
    title: string,
    body: string,
    eventType: EventSeason,
    audience: NotificationAudience,
  ) => {
    if (!user) throw new Error('A signed-in user is required to send notifications');
    await createNotification(title, body, eventType, audience);
  }, [user]);

  return {
    registeredUsers,
    pendingUsers,
    teams,
    refreshTeams,
    deleteTeam,
    normalizeUserTeamNames,
    refreshRegisteredUsers,
    refreshPendingUsers,
    reviewRegistration,
    approveUser,
    assignFebrutalisTeamCaptain,
    addEvent,
    sendNotification,
  };
}
