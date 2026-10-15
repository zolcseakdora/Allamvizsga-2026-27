import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { MapScreen } from '@/src/screens/map-screen';
import { useMapPoints } from '@/src/hooks/use-map-points';
import { goBackOrHome } from '@/src/utils/navigation';

export default function MapRoute() {
  const router = useRouter();
  const { points, refresh } = useMapPoints();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <MapScreen
      points={points}
      onBack={() => goBackOrHome(router)}
      onRefresh={() => void refresh()}
    />
  );
}
