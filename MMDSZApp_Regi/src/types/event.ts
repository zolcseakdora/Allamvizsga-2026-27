import type { EventSeason } from '@/src/constants/event-schedule';

export type EventTheme = {
  primary: string;
  background: string;
  surface: string;
  border: string;
  activeSurface: string;
};

export type EventEdition = {
  id: string;
  type: EventSeason;
  editionYear: number;
  title: string;
  titleEn?: string;
  displayTitle?: string;
  dateLabel?: string;
  startDate: string;
  endDate: string;
  startsAt?: Date;
  endsAt?: Date;
  published: boolean;
  theme: EventTheme;
  logoUrl?: string;
};

export type EventDay = {
  id: string;
  date: string;
  weekday: string;
  order: number;
  eventType?: EventSeason;
  editionYear?: number;
};

export type EventProgramType =
  | 'pub_crawl'
  | 'game_block_a'
  | 'game_block_b'
  | 'kart'
  | 'gokart'
  | 'case'
  | 'party'
  | 'other';
export type EventProgramStatus = 'scheduled' | 'postponed' | 'cancelled';

export type EventProgramItem = {
  id: string;
  dayId: string;
  title: string;
  startsAt: string;
  type?: EventProgramType;
  status: EventProgramStatus;
  isHeadline?: boolean;
  eventType?: EventSeason;
  editionYear?: number;
  endsAt?: string;
  location?: string;
  description?: string;
  performer?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  legacyImageId?: string;
};
