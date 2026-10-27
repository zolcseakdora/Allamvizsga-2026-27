import type { EventEdition } from '@/src/types/event';
import type { EventSeason } from '@/src/constants/event-schedule';

export type EventDataMetadata = {
  eventType?: unknown;
  editionYear?: unknown;
  editionId?: unknown;
};

export function isVisibleForEvent(
  data: EventDataMetadata,
  eventType: EventSeason,
  edition: EventEdition | null,
) {
  if (data.eventType === undefined) return eventType === 'diaknapok';
  if (data.eventType !== eventType) return false;
  if (typeof data.editionId === 'string' && data.editionId !== edition?.id) return false;
  if (typeof data.editionYear === 'number' && data.editionYear !== edition?.editionYear) return false;
  return true;
}
