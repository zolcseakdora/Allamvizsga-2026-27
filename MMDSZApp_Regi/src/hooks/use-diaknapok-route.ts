import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { useEventSeason } from '@/src/context/EventSeasonContext';

export function useDiaknapokOnlyRoute() {
  const router = useRouter();
  const { eventType } = useEventSeason();
  const isAvailable = eventType === 'diaknapok';

  useEffect(() => {
    if (!isAvailable) router.replace('/schedule');
  }, [isAvailable, router]);

  return isAvailable;
}
