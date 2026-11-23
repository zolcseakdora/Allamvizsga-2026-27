export type CountdownStatus = 'upcoming' | 'ongoing' | 'ended' | 'unpublished';

export type EventCountdown = {
  status: CountdownStatus;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function timeParts(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function getEventCountdown(startsAt: Date | null, endsAt: Date | null, now: Date): EventCountdown {
  if (!startsAt || !endsAt || endsAt.getTime() <= startsAt.getTime()) {
    return { status: 'unpublished', days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  if (now.getTime() < startsAt.getTime()) {
    return { status: 'upcoming', ...timeParts(startsAt.getTime() - now.getTime()) };
  }

  if (now.getTime() < endsAt.getTime()) {
    return { status: 'ongoing', days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return { status: 'ended', days: 0, hours: 0, minutes: 0, seconds: 0 };
}
