export const EVENT_DAYS = ['Szerda', 'Csütörtök', 'Péntek', 'Szombat'];

export const FEBRUTALIS_PREVIEW_DAYS = [
  { id: '2027-02-26', date: '2027-02-26', weekday: 'Péntek', order: 0 },
  { id: '2027-02-27', date: '2027-02-27', weekday: 'Szombat', order: 1 },
] as const;

export const EVENT_DAY_LABEL_KEYS = {
	Szerda: 'days.wednesday',
	Csütörtök: 'days.thursday',
	Péntek: 'days.friday',
	Szombat: 'days.saturday',
} as const;