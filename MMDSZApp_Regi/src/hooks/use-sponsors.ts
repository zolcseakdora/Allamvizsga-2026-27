import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { useCallback, useState } from 'react';

import { db } from '@/src/config/firebase';
import type { Sponsor } from '@/src/types/sponsor';

function toSponsor(id: string, data: Record<string, unknown>): Sponsor | null {
  if (typeof data.name !== 'string' || typeof data.logo !== 'string') return null;

  return {
    id,
    name: data.name,
    logo: data.logo,
    link: typeof data.link === 'string' ? data.link : undefined,
    createdAt: data.createdAt,
  };
}

export function useSponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  const refreshSponsors = useCallback(async () => {
    const snapshot = await getDocs(collection(db, 'sponsors'));
    setSponsors(snapshot.docs.flatMap((item) => {
      const sponsor = toSponsor(item.id, item.data());
      return sponsor ? [sponsor] : [];
    }));
  }, []);

  const addSponsor = useCallback(async (sponsor: { name: string; logo: string; link?: string }) => {
    await addDoc(collection(db, 'sponsors'), {
      name: sponsor.name,
      logo: sponsor.logo,
      ...(sponsor.link ? { link: sponsor.link } : {}),
      createdAt: serverTimestamp(),
    });
    await refreshSponsors();
  }, [refreshSponsors]);

  const deleteSponsor = useCallback(async (sponsorId: string) => {
    await deleteDoc(doc(db, 'sponsors', sponsorId));
    await refreshSponsors();
  }, [refreshSponsors]);

  return { sponsors, refreshSponsors, addSponsor, deleteSponsor };
}
