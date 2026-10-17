import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';

import { db } from '@/src/config/firebase';
import type { Team } from '@/src/types/team';
import { normalizeTeamName } from '@/src/utils/team-name';

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

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);

  const refresh = useCallback(async () => {
    const snapshot = await getDocs(collection(db, 'teams'));
    setTeams(snapshot.docs.map((team) => toTeam(team.id, team.data())));
  }, []);

  const getTeam = useCallback(async (teamName: string) => {
    const normalizedName = normalizeTeamName(teamName);
    if (!normalizedName) return null;
    const snapshot = await getDoc(doc(db, 'teams', normalizedName));
    return snapshot.exists() ? toTeam(snapshot.id, snapshot.data()) : null;
  }, []);

  const saveTeam = useCallback(async (teamName: string, data: Partial<Team>) => {
    const normalizedName = normalizeTeamName(teamName);
    if (!normalizedName) throw new Error('Team name cannot be empty');
    await setDoc(doc(db, 'teams', normalizedName), { ...data, name: normalizedName }, { merge: true });
  }, []);

  return { teams, refresh, getTeam, saveTeam };
}
