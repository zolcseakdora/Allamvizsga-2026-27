import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useCallback, useState } from 'react';

import { auth, db, functions } from '@/src/config/firebase';
import { useAuth } from '@/src/context/AuthContext';
import { createNotification } from '@/src/services/notifications';
import { UserRole } from '@/src/types/auth';
import { normalizeTeamName, teamNameKey } from '@/src/utils/team-name';
import type { Team } from '@/src/types/team';

export type RegisteredUser = {
  id: string;
  name?: string;
  role?: UserRole;
  igazolas?: string;
};

export type PendingUser = {
  id: string;
  name?: string;
  role?: UserRole;
  email?: string;
  team?: string;
  isVerified?: boolean;
  accountStatus?: string;
  igazolas: string;
};

function toTeam(id: string, data: Record<string, unknown>): Team {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : undefined,
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

  const refreshTeams = useCallback(async () => {
    const snapshot = await getDocs(collection(db, 'teams'));
    setTeams(snapshot.docs.map((item) => toTeam(item.id, item.data())));
  }, []);

  const deleteTeam = useCallback(async (teamId: string) => {
    requireHeadOrganizer();
    await deleteDoc(doc(db, 'teams', teamId));
    await refreshTeams();
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

  const refreshRegisteredUsers = useCallback(async () => {
    const snapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    setRegisteredUsers(snapshot.docs.map((item) => {
      const data = item.data();
      return { id: item.id, ...data, role: toUserRole(data.role) } as RegisteredUser;
    }));
  }, []);

  const refreshPendingUsers = useCallback(async () => {
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
      const isPending = (accountStatus !== undefined && pendingStatuses.has(accountStatus))
        || (membershipStatus !== undefined && pendingStatuses.has(membershipStatus));
      const isLegacyPending = !accountStatus && !membershipStatus
        && data.isVerified !== true && typeof data.igazolas === 'string' && !!data.igazolas.trim();
      if (!isPending && !isLegacyPending) return;

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
        isVerified: data.isVerified === true,
        accountStatus,
        igazolas: typeof data.igazolas === 'string' ? data.igazolas : '',
      });
    });
    setPendingUsers(pending);
  }, []);

  const approveUser = useCallback(async (userId: string) => {
    requireHeadOrganizer();
    const userRef = doc(db, 'users', userId);
    const userSnapshot = await getDoc(userRef);
    if (!userSnapshot.exists()) throw new Error('The user profile no longer exists');
    const data = userSnapshot.data();
    const accountStatus: unknown = data.accountStatus;
    const membershipStatus: unknown = data.membershipStatus;
    const status = typeof accountStatus === 'string' ? accountStatus : membershipStatus;
    if (status === 'pending_captain_approval') {
      const reviewCaptainRegistration = httpsCallable<
        { uid: string; approved: boolean }, { status: string }
      >(functions, 'reviewCaptainRegistration');
      await reviewCaptainRegistration({ uid: userId, approved: true });
    } else if (status === 'pending_verification'
      || status === 'pending_admin_approval'
      || status === 'pending_admin_activation') {
      const reviewPendingMembership = httpsCallable<
        { uid: string; approved: boolean }, { status: string }
      >(functions, 'reviewPendingMembership');
      await reviewPendingMembership({ uid: userId, approved: true });
    } else if (status === undefined && data.isVerified !== true
      && typeof data.igazolas === 'string' && !!data.igazolas.trim()) {
      // Régi, accountStatus nélküli profilok; a Firestore-szabály is főszervezőt követel.
      await updateDoc(userRef, { isVerified: true });
    } else {
      throw new Error('Ez a felhasználó nem vár jóváhagyásra.');
    }
    await refreshPendingUsers();
  }, [refreshPendingUsers, requireHeadOrganizer]);

  const createMissingTeams = useCallback(async () => {
    const [usersSnapshot, teamsSnapshot] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'teams')),
    ]);
    const existingTeamNames = new Set(teamsSnapshot.docs.flatMap((team) => {
      const names = [team.id];
      const dataName: unknown = team.data().name;
      if (typeof dataName === 'string') names.push(dataName);
      return names.map(teamNameKey).filter(Boolean);
    }));
    const missingTeamNames = new Map<string, string>();

    usersSnapshot.docs.forEach((item) => {
      const team = item.data().team;
      if (typeof team !== 'string') return;

      const name = normalizeTeamName(team);
      const key = teamNameKey(name);
      if (!key || key === teamNameKey('Egyéni') || existingTeamNames.has(key)) return;
      if (!missingTeamNames.has(key)) missingTeamNames.set(key, name);
    });

    await Promise.all([...missingTeamNames.values()].map((name) => (
      setDoc(doc(db, 'teams', name), { name }, { merge: true })
    )));

    return missingTeamNames.size;
  }, []);

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

  const sendNotification = useCallback(async (title: string, body: string) => {
    if (!user) throw new Error('A signed-in user is required to send notifications');
    await createNotification(title, body, user.uid, profile?.name || user.displayName || '');
  }, [profile?.name, user]);

  return {
    registeredUsers,
    pendingUsers,
    teams,
    refreshTeams,
    deleteTeam,
    normalizeUserTeamNames,
    refreshRegisteredUsers,
    refreshPendingUsers,
    approveUser,
    createMissingTeams,
    addEvent,
    sendNotification,
  };
}
