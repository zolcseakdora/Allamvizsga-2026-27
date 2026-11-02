import type { EventSeason } from '@/src/constants/event-schedule';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getUserTeamForEvent(
  data: unknown,
  editionId: string | undefined,
  eventType: EventSeason,
  isPreview: boolean,
) {
  if (!isRecord(data)) return '';
  const assignments = data.eventTeamAssignments;
  if (editionId && isRecord(assignments) && typeof assignments[editionId] === 'string') {
    return assignments[editionId];
  }
  return eventType === 'diaknapok' && !isPreview && typeof data.team === 'string'
    ? data.team
    : '';
}
