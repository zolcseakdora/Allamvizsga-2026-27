import { useCallback, useMemo } from 'react';

import { EVENT_DAYS, FEBRUTALIS_PREVIEW_DAYS } from '@/src/constants/event-days';
import { isProgramTypeVisible } from '@/src/constants/event-programs';
import { useEventSeason } from '@/src/context/EventSeasonContext';
import { useEventPrograms } from '@/src/hooks/use-event-programs';
import { usePrograms } from '@/src/hooks/use-programs';
import type { EventDay, EventProgramItem, EventProgramStatus, EventProgramType } from '@/src/types/event';
import type { Program } from '@/src/types/program';

export type ScheduleProgram = {
  id: string;
  dayId: string;
  day?: string;
  time?: string;
  endsAt?: string;
  helyszín?: string;
  title?: string;
  thumb?: string;
  image?: string;
  description?: string;
  type?: EventProgramType;
  status: EventProgramStatus;
  isHeadline?: boolean;
  source: 'edition' | 'legacy';
};

function toScheduleProgram(program: EventProgramItem, day: EventDay): ScheduleProgram {
  return {
    id: program.id,
    dayId: day.id,
    day: day.weekday,
    time: program.startsAt,
    endsAt: program.endsAt,
    helyszín: program.location,
    title: program.title,
    thumb: program.thumbnailUrl,
    image: program.imageUrl,
    description: program.description,
    type: program.type,
    status: program.status,
    isHeadline: program.isHeadline,
    source: 'edition',
  };
}

function fromLegacyProgram(program: Program): ScheduleProgram {
  return {
    id: program.id,
    dayId: program.day ?? '',
    day: program.day,
    time: program.time,
    helyszín: program.helyszín,
    title: program.title,
    thumb: program.thumb,
    image: program.image,
    description: program.description,
    status: 'scheduled',
    source: 'legacy',
  };
}

function getLegacyDays(): EventDay[] {
  return EVENT_DAYS.map((weekday, order) => ({
    id: weekday,
    date: '',
    weekday,
    order,
  }));
}

export function useSchedulePrograms() {
  const { edition, eventType, isPreview } = useEventSeason();
  const legacy = usePrograms();
  const event = useEventPrograms(edition);
  const {
    days: editionDays,
    programs: editionPrograms,
    isLoading: editionIsLoading,
    error: editionError,
    hasLoaded: hasLoadedEdition,
    refresh: refreshEdition,
    saveDay,
    deleteDay,
    getDay: getEditionDay,
    saveProgram: saveEditionProgram,
    getProgram: getEditionProgram,
    getProgramImage: getEditionProgramImage,
    deleteProgram: deleteEditionProgram,
  } = event;
  const {
    programs: legacyPrograms,
    isLoading: legacyIsLoading,
    error: legacyError,
    refresh: refreshLegacy,
    getProgram: getLegacyProgram,
    getProgramImage: getLegacyProgramImage,
    deleteProgram: deleteLegacyProgram,
  } = legacy;
  const hasEditionDays = Boolean(edition && hasLoadedEdition && editionDays.length > 0);
  const useLegacy = eventType === 'diaknapok' && !isPreview && !hasEditionDays;

  const days = useMemo(() => {
    if (hasEditionDays) return editionDays;
    if (eventType === 'februtalis') {
      return [...FEBRUTALIS_PREVIEW_DAYS];
    }
    return useLegacy ? getLegacyDays() : [];
  }, [editionDays, eventType, hasEditionDays, useLegacy]);

  const programs = useMemo(() => {
    if (hasEditionDays) {
      const items = editionPrograms.flatMap((program) => {
        const day = editionDays.find((item) => item.id === program.dayId);
        return day ? [toScheduleProgram(program, day)] : [];
      });
      return items;
    }
    if (useLegacy) return legacyPrograms.map(fromLegacyProgram);
    return [];
  }, [editionDays, editionPrograms, hasEditionDays, legacyPrograms, useLegacy]);
  const sortedPrograms = useMemo(() => [...programs].sort((left, right) => (
    timeScore(left.time) - timeScore(right.time)
  )), [programs]);

  const refresh = useCallback(async () => {
    if (edition) {
      await Promise.all([
        refreshEdition(),
        ...(eventType === 'diaknapok' && !isPreview ? [refreshLegacy()] : []),
      ]);
      return;
    }
    if (eventType === 'diaknapok' && !isPreview) {
      await refreshLegacy();
    }
  }, [edition, eventType, isPreview, refreshEdition, refreshLegacy]);

  const getProgram = useCallback(async (programId: string, dayId?: string) => {
    if (edition && !isPreview && dayId) {
      const program = await getEditionProgram(dayId, programId);
      const day = editionDays.find((item) => item.id === dayId) ?? await getEditionDay(dayId);
      return program && day && isProgramTypeVisible(eventType, day.weekday, program.type)
        ? toScheduleProgram(program, day)
        : null;
    }
    if (!useLegacy) return null;
    const program = await getLegacyProgram(programId);
    return program ? fromLegacyProgram(program) : null;
  }, [edition, editionDays, eventType, getEditionDay, getEditionProgram, getLegacyProgram, isPreview, useLegacy]);

  const getProgramImage = useCallback(async (programId: string, dayId?: string) => {
    if (edition && !isPreview && dayId) return getEditionProgramImage(dayId, programId);
    return useLegacy ? getLegacyProgramImage(programId) : null;
  }, [edition, getEditionProgramImage, getLegacyProgramImage, isPreview, useLegacy]);

  const deleteProgram = useCallback(async (programId: string, dayId?: string) => {
    if (edition && !isPreview && dayId) return deleteEditionProgram(dayId, programId);
    if (useLegacy) return deleteLegacyProgram(programId);
    throw new Error('There is no editable program in the selected event preview.');
  }, [deleteEditionProgram, deleteLegacyProgram, edition, isPreview, useLegacy]);

  return {
    days,
    programs: sortedPrograms,
    eventType,
    isPreview,
    isLoading: editionIsLoading || (useLegacy && legacyIsLoading),
    error: editionError ?? (useLegacy ? legacyError : null),
    refresh,
    saveDay,
    deleteDay,
    saveEventProgram: saveEditionProgram,
    getProgram,
    getProgramImage,
    deleteProgram,
  };
}

function timeScore(time: string | undefined) {
  if (!time) return Number.MAX_SAFE_INTEGER;
  const match = /(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return (hours < 7 ? hours + 24 : hours) * 60 + minutes;
}
