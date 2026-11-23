import { useEffect, useState } from 'react';

import { getEventCountdown } from '@/src/constants/event-countdown';
import { getNextRomanianMidnight, getRomanianMidnight } from '@/src/constants/event-schedule';
import type { EventEdition } from '@/src/types/event';

export function useCountdown(edition: EventEdition | null) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const startsAt = edition?.startDate ? getRomanianMidnight(edition.startDate) : null;
  const endsAt = edition?.endDate
    ? getNextRomanianMidnight(getRomanianMidnight(edition.endDate))
    : null;

  return getEventCountdown(startsAt, endsAt, now);
}
