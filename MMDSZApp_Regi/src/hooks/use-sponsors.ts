import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';

import { db } from '@/src/config/firebase';
import { useAuth } from '@/src/context/AuthContext';
import type { Sponsor } from '@/src/types/sponsor';
import { UserRole } from '@/src/types/auth';
import { normalizeTeamName } from '@/src/utils/team-name';

function toSponsor(id: string, data: Record<string, unknown>): Sponsor | null {
  if (
    typeof data.name !== 'string'
    || !data.name.trim()
    || typeof data.logo !== 'string'
    || !data.logo
    || typeof data.team !== 'string'
    || !data.team.trim()
  ) return null;

  return {
    id,
    name: data.name,
    logo: data.logo,
    team: data.team,
  };
}

export function useSponsors() {
  const { profile } = useAuth();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  const requireTeamManager = useCallback(() => {
    const team = normalizeTeamName(profile?.team ?? '');
    const isCaptain = profile?.role === UserRole.CSAPATKAPITANY
      || profile?.role === UserRole.ALCSAPATKAPITANY;
    if (!profile?.isVerified || !isCaptain || !team) {
      throw new Error('Only an approved captain or deputy captain can manage team sponsors');
    }
    return team;
  }, [profile]);

  const refreshSponsors = useCallback(async () => {
    const snapshot = await getDocs(collection(db, 'sponsors'));
    setSponsors(snapshot.docs.flatMap((item) => {
      const sponsor = toSponsor(item.id, item.data());
      return sponsor ? [sponsor] : [];
    }));
  }, []);

  const addSponsor = useCallback(async (sponsor: { name: string; logo: string }) => {
    const team = requireTeamManager();
    const name = sponsor.name.trim();
    if (!name || !sponsor.logo) throw new Error('Sponsor name and logo are required');
    await addDoc(collection(db, 'sponsors'), {
      name,
      logo: sponsor.logo,
      team,
    });
    await refreshSponsors();
  }, [refreshSponsors, requireTeamManager]);

  const updateSponsor = useCallback(async (
    sponsorId: string,
    sponsor: { name: string; logo: string },
  ) => {
    const team = requireTeamManager();
    const existing = sponsors.find((item) => item.id === sponsorId);
    if (!existing || existing.team !== team) {
      throw new Error("Sponsor does not belong to the signed-in user's team");
    }
    const name = sponsor.name.trim();
    if (!name || !sponsor.logo) throw new Error('Sponsor name and logo are required');
    await updateDoc(doc(db, 'sponsors', sponsorId), { name, logo: sponsor.logo });
    await refreshSponsors();
  }, [refreshSponsors, requireTeamManager, sponsors]);

  const deleteSponsor = useCallback(async (sponsorId: string) => {
    const team = requireTeamManager();
    const existing = sponsors.find((item) => item.id === sponsorId);
    if (!existing || existing.team !== team) {
      throw new Error("Sponsor does not belong to the signed-in user's team");
    }
    await deleteDoc(doc(db, 'sponsors', sponsorId));
    await refreshSponsors();
  }, [refreshSponsors, requireTeamManager, sponsors]);

  return { sponsors, refreshSponsors, addSponsor, updateSponsor, deleteSponsor };
}
