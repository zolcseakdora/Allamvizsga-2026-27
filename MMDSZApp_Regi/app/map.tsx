import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { MapScreen } from '@/src/screens/map-screen';
import { useMapPoints } from '@/src/hooks/use-map-points';

export default function MapRoute() {
  const router = useRouter();
  const { points, refresh } = useMapPoints();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <MapScreen
      points={points}
      onBack={() => router.back()}
      onRefresh={() => void refresh()}
    />
  );
}
