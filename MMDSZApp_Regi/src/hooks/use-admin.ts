import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { useCallback, useState } from 'react';

import { auth, db } from '@/src/config/firebase';
import { useAuth } from '@/src/context/AuthContext';
import { createNotification } from '@/src/services/notifications';
import type { NotificationAudience } from '@/src/services/notifications';
import {
  assignFebrutalisTeamCaptain as assignFebrutalisTeamCaptainCall,
  listFebrutalisRegistrations,
} from '@/src/services/event-admin';
import { UserRole } from '@/src/types/auth';
import { normalizeTeamName, teamNameKey } from '@/src/utils/team-name';
import type { Team } from '@/src/types/team';
import type { EventSeason } from '@/src/constants/event-schedule';

export type RegisteredUser = {
  id: string;
  name?: string;
  role?: UserRole;
  igazolas?: string;
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
      return { id: item.id, ...data, role: toUserRole(data.role) } as RegisteredUser;
    }));
  }, []);

  const refreshPendingUsers = useCallback(async (eventType: EventSeason = 'diaknapok') => {
    const snapshot = await getDocs(collection(db, 'users'));
    const pending: PendingUser[] = [];
    snapshot.docs.forEach((item) => {
      const data = item.data();
      const eventVerifications = data.eventVerifications;
      const verification = eventVerifications && typeof eventVerifications === 'object'
        ? (eventVerifications as Record<string, unknown>)[eventType]
        : undefined;
      const verificationData = verification && typeof verification === 'object'
        ? verification as Record<string, unknown>
        : undefined;
      const isEventVerification = typeof verificationData?.imageUrl === 'string';
      const isLegacy = !isEventVerification
        && eventType === 'diaknapok'
        && typeof data.igazolas === 'string';
      const imageUrl = isEventVerification
        ? verificationData.imageUrl as string
        : isLegacy
          ? data.igazolas as string
          : undefined;
      if (!imageUrl) return;

      pending.push({
        id: item.id,
        name: typeof data.name === 'string' ? data.name : undefined,
        role: toUserRole(data.role),
        email: typeof data.email === 'string' ? data.email : undefined,
        team: typeof data.team === 'string' ? data.team : undefined,
        isVerified: isEventVerification
          ? verificationData.status === 'approved'
          : data.isVerified === true,
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
    const updates: Record<string, unknown> = { isVerified: true };
    if (!isLegacy) updates[`eventVerifications.${eventType}.status`] = 'approved';
    await updateDoc(doc(db, 'users', userId), updates);
    await refreshPendingUsers(eventType);
  }, [refreshPendingUsers]);

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
    approveUser,
    createMissingTeams,
    assignFebrutalisTeamCaptain,
    addEvent,
    sendNotification,
  };
}
