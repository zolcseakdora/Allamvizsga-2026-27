import type { EventSeason } from '@/src/constants/event-schedule';
import type { EventProgramType } from '@/src/types/event';

const ALL_PROGRAM_TYPES: EventProgramType[] = [
  'pub_crawl',
  'game_block_a',
  'game_block_b',
  'kart',
  'gokart',
  'case',
  'party',
  'other',
];

const FEBRUTALIS_DAY_TYPES: Record<string, readonly EventProgramType[]> = {
  Péntek: ['pub_crawl', 'gokart', 'other'],
  Szombat: ['case', 'party', 'game_block_a', 'game_block_b', 'other'],
};

export function isProgramTypeVisible(
  eventType: EventSeason,
  weekday: string,
  programType: EventProgramType | undefined,
) {
  if (programType === undefined) {
    return eventType === 'diaknapok';
  }

  if (eventType === 'diaknapok') {
    return ALL_PROGRAM_TYPES.includes(programType);
  }

  if (eventType === 'februtalis') {
    const allowedTypes = FEBRUTALIS_DAY_TYPES[weekday] ?? ['other'];
    return allowedTypes.includes(programType);
  }

  return false;
}
