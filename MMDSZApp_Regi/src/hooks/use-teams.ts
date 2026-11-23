import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';

import { db } from '@/src/config/firebase';
import type { Team } from '@/src/types/team';
import type { EventSeason } from '@/src/constants/event-schedule';
import { normalizeTeamName } from '@/src/utils/team-name';

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

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);

  const refresh = useCallback(async (eventType: EventSeason = 'diaknapok') => {
    const snapshot = await getDocs(collection(db, 'teams'));
    setTeams(snapshot.docs
      .filter((team) => (
        eventType === 'februtalis'
          ? team.data().eventType === 'februtalis'
          : team.data().eventType === undefined || team.data().eventType === 'diaknapok'
      ))
      .map((team) => toTeam(team.id, team.data())));
  }, []);

  const getTeam = useCallback(async (teamName: string, eventType: EventSeason = 'diaknapok') => {
    const normalizedName = normalizeTeamName(teamName);
    if (!normalizedName) return null;
    const snapshot = await getDoc(doc(db, 'teams', normalizedName));
    if (
      snapshot.exists()
      && eventType === 'februtalis'
      && snapshot.data().eventType !== 'februtalis'
    ) return null;
    return snapshot.exists() ? toTeam(snapshot.id, snapshot.data()) : null;
  }, []);

  const saveTeam = useCallback(async (
    teamName: string,
    data: Partial<Team>,
    eventType: EventSeason = 'diaknapok',
  ) => {
    const normalizedName = normalizeTeamName(teamName);
    if (!normalizedName) throw new Error('Team name cannot be empty');
    await setDoc(doc(db, 'teams', normalizedName), eventType === 'februtalis'
      ? { ...data, eventType }
      : { ...data, name: normalizedName }, { merge: true });
  }, []);

  return { teams, refresh, getTeam, saveTeam };
}
