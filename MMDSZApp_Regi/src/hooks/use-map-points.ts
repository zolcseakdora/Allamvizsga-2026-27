import { collection, getDocs } from 'firebase/firestore';
import { useCallback, useState } from 'react';

import { db } from '@/src/config/firebase';

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
};

export function useMapPoints() {
  const [points, setPoints] = useState<MapPoint[]>([]);

  const refresh = useCallback(async () => {
    const snapshot = await getDocs(collection(db, 'map_points'));
    setPoints(snapshot.docs.map((point) => {
      const data = point.data();
      return {
        id: point.id,
        lat: typeof data.lat === 'number' ? data.lat : 0,
        lng: typeof data.lng === 'number' ? data.lng : 0,
        title: typeof data.title === 'string' ? data.title : undefined,
        description: typeof data.description === 'string' ? data.description : undefined,
      };
    }));
  }, []);

  return { points, refresh };
}
