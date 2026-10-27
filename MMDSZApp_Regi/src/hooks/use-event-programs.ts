import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { useCallback, useState } from 'react';

import { db } from '@/src/config/firebase';
import { isProgramTypeVisible } from '@/src/constants/event-programs';
import type { EventDay, EventEdition, EventProgramItem, EventProgramStatus, EventProgramType } from '@/src/types/event';

function toEventDay(id: string, data: Record<string, unknown>): EventDay {
  if (
    typeof data.date !== 'string'
    || typeof data.weekday !== 'string'
    || typeof data.order !== 'number'
  ) {
    throw new Error(`Event day "${id}" has invalid fields.`);
  }

  return { id, date: data.date, weekday: data.weekday, order: data.order };
}

function toProgramItem(id: string, dayId: string, data: Record<string, unknown>): EventProgramItem {
  if (typeof data.title !== 'string' || typeof data.startsAt !== 'string') {
    throw new Error(`Program item "${id}" has invalid required fields.`);
  }

  const validTypes: EventProgramType[] = [
    'pub_crawl',
    'game_block_a',
    'game_block_b',
    'kart',
    'gokart',
    'case',
    'party',
    'other',
  ];
  const validStatuses: EventProgramStatus[] = ['scheduled', 'postponed', 'cancelled'];
  const type = validTypes.find((candidate) => candidate === data.type);
  const status = validStatuses.find((candidate) => candidate === data.status);
  if (data.type !== undefined && !type) {
    throw new Error(`Program item "${id}" has an unsupported type.`);
  }
  if (data.status !== undefined && !status) {
    throw new Error(`Program item "${id}" has an unsupported status.`);
  }

  return {
    id,
    dayId,
    title: data.title,
    startsAt: data.startsAt,
    ...(type ? { type } : {}),
    status: status ?? 'scheduled',
    ...(typeof data.endsAt === 'string' ? { endsAt: data.endsAt } : {}),
    ...(typeof data.isHeadline === 'boolean' ? { isHeadline: data.isHeadline } : {}),
    ...(data.eventType === 'diaknapok' || data.eventType === 'februtalis'
      ? { eventType: data.eventType }
      : {}),
    ...(typeof data.editionYear === 'number' ? { editionYear: data.editionYear } : {}),
    ...(typeof data.location === 'string' ? { location: data.location } : {}),
    ...(typeof data.description === 'string' ? { description: data.description } : {}),
    ...(typeof data.performer === 'string' ? { performer: data.performer } : {}),
    ...(typeof data.imageUrl === 'string' ? { imageUrl: data.imageUrl } : {}),
    ...(typeof data.thumbnailUrl === 'string' ? { thumbnailUrl: data.thumbnailUrl } : {}),
    ...(typeof data.legacyImageId === 'string' ? { legacyImageId: data.legacyImageId } : {}),
  };
}

export function useEventPrograms(edition: EventEdition | null) {
  const [days, setDays] = useState<EventDay[]>([]);
  const [programs, setPrograms] = useState<EventProgramItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!edition) {
      setDays([]);
      setPrograms([]);
      setError(null);
      setHasLoaded(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const daySnapshot = await getDocs(collection(db, 'events', edition.id, 'days'));
      const loadedDays = daySnapshot.docs
        .map((item) => toEventDay(item.id, item.data()))
        .sort((left, right) => left.order - right.order);
      const nextDays = loadedDays;
      const programSnapshots = await Promise.all(
        nextDays.map((day) => getDocs(collection(db, 'events', edition.id, 'days', day.id, 'programItems'))),
      );
      const nextPrograms = programSnapshots.flatMap((snapshot, index) => snapshot.docs
        .map((item) => toProgramItem(item.id, nextDays[index].id, item.data()))
        .filter((program) => isProgramTypeVisible(
          edition.type,
          nextDays[index].weekday,
          program.type,
        )));

      setDays(nextDays);
      setPrograms(nextPrograms);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [edition]);

  const saveDay = useCallback(async (day: {
    id?: string;
    date: string;
    weekday: string;
    order: number;
  }) => {
    if (!edition || edition.id.startsWith('preview-')) {
      throw new Error('No published event edition is selected for day changes.');
    }
    const dayRef = day.id
      ? doc(db, 'events', edition.id, 'days', day.id)
      : doc(collection(db, 'events', edition.id, 'days'));
    await setDoc(dayRef, {
      date: day.date,
      weekday: day.weekday.trim(),
      order: day.order,
      eventType: edition.type,
      editionYear: edition.editionYear,
    }, { merge: true });
    await refresh();
    return dayRef.id;
  }, [edition, refresh]);

  const deleteDay = useCallback(async (dayId: string) => {
    if (!edition || edition.id.startsWith('preview-')) {
      throw new Error('No published event edition is selected for day changes.');
    }
    const dayRef = doc(db, 'events', edition.id, 'days', dayId);
    const programSnapshot = await getDocs(collection(dayRef, 'programItems'));
    if (!programSnapshot.empty) {
      throw new Error('Delete or move this day’s programs before deleting the day.');
    }
    await deleteDoc(dayRef);
    await refresh();
  }, [edition, refresh]);

  const getDay = useCallback(async (dayId: string) => {
    if (!edition) return null;
    const snapshot = await getDoc(doc(db, 'events', edition.id, 'days', dayId));
    return snapshot.exists() ? toEventDay(snapshot.id, snapshot.data()) : null;
  }, [edition]);

  const saveProgram = useCallback(async (program: {
    id?: string;
    dayId: string;
    title: string;
    startsAt: string;
    endsAt?: string;
    location: string;
    description: string;
    type?: EventProgramType;
    status: EventProgramStatus;
    isHeadline: boolean;
    image?: { image: string; thumb: string };
  }) => {
    if (!edition || edition.id.startsWith('preview-')) {
      throw new Error('No published event edition is selected for program changes.');
    }
    const programCollection = collection(
      db,
      'events',
      edition.id,
      'days',
      program.dayId,
      'programItems',
    );
    const programRef = program.id ? doc(programCollection, program.id) : doc(programCollection);
    await setDoc(programRef, {
      title: program.title.trim(),
      startsAt: program.startsAt.trim(),
      ...(program.endsAt ? { endsAt: program.endsAt.trim() } : {}),
      location: program.location.trim(),
      description: program.description.trim(),
      ...(program.type ? { type: program.type } : {}),
      status: program.status,
      isHeadline: program.isHeadline,
      ...(program.image ? {
        imageUrl: program.image.image,
        thumbnailUrl: program.image.thumb,
      } : {}),
      eventType: edition.type,
      editionYear: edition.editionYear,
    }, { merge: true });
    await refresh();
    return programRef.id;
  }, [edition, refresh]);

  const getProgram = useCallback(async (dayId: string, programId: string) => {
    if (!edition) return null;
    const snapshot = await getDoc(doc(db, 'events', edition.id, 'days', dayId, 'programItems', programId));
    return snapshot.exists() ? toProgramItem(snapshot.id, dayId, snapshot.data()) : null;
  }, [edition]);

  const getProgramImage = useCallback(async (dayId: string, programId: string) => {
    if (!edition) return null;
    const snapshot = await getDoc(doc(db, 'events', edition.id, 'days', dayId, 'programItems', programId));
    const programData = snapshot.data();
    const directImage = programData?.imageUrl;
    if (typeof directImage === 'string') return directImage;
    const legacyImageId = typeof programData?.legacyImageId === 'string'
      ? programData.legacyImageId
      : undefined;
    if (!legacyImageId) return null;
    const legacySnapshot = await getDoc(doc(db, 'program_images', legacyImageId));
    const image = legacySnapshot.data()?.image;
    return typeof image === 'string' ? image : null;
  }, [edition]);

  const deleteProgram = useCallback(async (dayId: string, programId: string) => {
    if (!edition) throw new Error('No event edition is selected.');
    if (edition.id.startsWith('preview-')) {
      throw new Error('Programs cannot be changed in a local preview.');
    }
    const batch = writeBatch(db);
    batch.delete(doc(db, 'events', edition.id, 'days', dayId, 'programItems', programId));
    await batch.commit();
    setPrograms((current) => current.filter((program) => program.id !== programId));
  }, [edition]);

  return {
    days,
    programs,
    isLoading,
    hasLoaded,
    error,
    refresh,
    saveDay,
    deleteDay,
    getDay,
    saveProgram,
    getProgram,
    getProgramImage,
    deleteProgram,
  };
}
