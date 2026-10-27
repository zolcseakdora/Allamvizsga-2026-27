export type EventSeason = 'februtalis' | 'diaknapok';

export const EVENT_TIME_ZONE = 'Europe/Bucharest';

const bucharestDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const DEFAULT_EVENT_THEME = {
  primary: '#EC2127',
  background: '#121212',
  surface: '#1E1E1E',
  border: '#333333',
  activeSurface: '#321719',
} as const;

export function getRomanianDateKey(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('A valid date is required.');
  }

  const parts = Object.fromEntries(
    bucharestDateFormatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getNextRomanianMidnight(date: Date): Date {
  const [yearText, monthText, dayText] = getRomanianDateKey(date).split('-');
  const nextDay = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText) + 1))
    .toISOString()
    .slice(0, 10);
  return getRomanianMidnight(nextDay);
}

export function getActiveEvent(date: Date): EventSeason {
  const [, monthText, dayText] = getRomanianDateKey(date).split('-');
  const month = Number(monthText);
  const day = Number(dayText);
  const isFebrutalisSeason = month === 12 || (month <= 3 && (month < 3 || day <= 15));

  return isFebrutalisSeason ? 'februtalis' : 'diaknapok';
}

export const getEventSeason = getActiveEvent;

export function getRomanianMidnight(date: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error(`Invalid event date "${date}". Use YYYY-MM-DD.`);
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const targetUtc = Date.UTC(year, month - 1, day);
  const validated = new Date(targetUtc);

  if (
    validated.getUTCFullYear() !== year
    || validated.getUTCMonth() !== month - 1
    || validated.getUTCDate() !== day
  ) {
    throw new Error(`Invalid event date "${date}". Use a valid YYYY-MM-DD.`);
  }

  let timestamp = targetUtc;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const localParts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: EVENT_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date(timestamp)).map(({ type, value }) => [type, value]),
    );
    const actualLocalAsUtc = Date.UTC(
      Number(localParts.year),
      Number(localParts.month) - 1,
      Number(localParts.day),
      Number(localParts.hour),
      Number(localParts.minute),
      Number(localParts.second),
    );
    timestamp += targetUtc - actualLocalAsUtc;
  }

  return new Date(timestamp);
}
