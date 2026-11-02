import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { db } from '@/src/config/firebase';
import diaknapok2027 from '@/data/events/diaknapok-2027.json';
import februtalis2027 from '@/data/events/februtalis-2027.json';
import {
  getActiveEvent,
  getNextRomanianMidnight,
  getRomanianDateKey,
  getRomanianMidnight,
  type EventSeason,
} from '@/src/constants/event-schedule';
import { useAuth } from '@/src/context/AuthContext';
import { UserRole } from '@/src/types/auth';
import type { EventEdition, EventTheme } from '@/src/types/event';

type EventSeasonContextValue = {
  season: EventSeason;
  eventType: EventSeason;
  setEventType: (event: EventSeason) => void;
  actualEventType: EventSeason;
  edition: EventEdition | null;
  theme: EventTheme;
  isLoading: boolean;
  error: Error | null;
  previewEvent: EventSeason | null;
  isPreview: boolean;
  setPreviewEvent: (event: EventSeason | null) => void;
};

const EventSeasonContext = createContext<EventSeasonContextValue | null>(null);

const DEFAULT_EVENT_THEME: EventTheme = {
  primary: '#EC2127',
  background: '#121212',
  surface: '#1E1E1E',
  border: '#333333',
  activeSurface: '#321719',
};

function toEventEdition(id: string, value: Record<string, unknown>): EventEdition | null {
  if (value.published !== true) return null;
  const { type, editionYear, title, titleEn, startDate, endDate, theme, logoUrl } = value;
  if (
    (type !== 'februtalis' && type !== 'diaknapok')
    || typeof editionYear !== 'number'
    || !Number.isInteger(editionYear)
    || typeof title !== 'string'
    || typeof startDate !== 'string'
    || typeof endDate !== 'string'
  ) {
    throw new Error(`Published event "${id}" has invalid required fields.`);
  }

  if (getRomanianMidnight(endDate) < getRomanianMidnight(startDate)) {
    throw new Error(`Event "${id}" ends before it starts.`);
  }

  const eventTheme: Record<string, unknown> = typeof theme === 'object' && theme !== null
    ? theme as Record<string, unknown>
    : {};
  const startsAt = value.startsAt instanceof Timestamp ? value.startsAt.toDate() : undefined;
  const endsAt = value.endsAt instanceof Timestamp ? value.endsAt.toDate() : undefined;
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new Error(`Event "${id}" ends before it starts.`);
  }

  return {
    id,
    type,
    editionYear,
    title,
    startDate,
    endDate,
    ...(startsAt ? { startsAt } : {}),
    ...(endsAt ? { endsAt } : {}),
    published: true,
    theme: {
      primary: typeof eventTheme.primary === 'string' ? eventTheme.primary : DEFAULT_EVENT_THEME.primary,
      background: typeof eventTheme.background === 'string' ? eventTheme.background : DEFAULT_EVENT_THEME.background,
      surface: typeof eventTheme.surface === 'string' ? eventTheme.surface : DEFAULT_EVENT_THEME.surface,
      border: typeof eventTheme.border === 'string' ? eventTheme.border : DEFAULT_EVENT_THEME.border,
      activeSurface: typeof eventTheme.activeSurface === 'string'
        ? eventTheme.activeSurface
        : DEFAULT_EVENT_THEME.activeSurface,
    },
    ...(typeof titleEn === 'string' ? { titleEn } : {}),
    ...(typeof value.displayTitle === 'string' ? { displayTitle: value.displayTitle } : {}),
    ...(typeof value.dateLabel === 'string' ? { dateLabel: value.dateLabel } : {}),
    ...(typeof logoUrl === 'string' ? { logoUrl } : {}),
  };
}

const BUNDLED_EDITIONS = [
  toEventEdition(diaknapok2027.id, { ...diaknapok2027 }),
  toEventEdition(februtalis2027.id, { ...februtalis2027 }),
].filter((edition): edition is EventEdition => edition !== null);

function selectEdition(editions: EventEdition[], eventType: EventSeason, now: Date) {
  const dateKey = getRomanianDateKey(now);
  const liveEditions = new Map(editions.map((edition) => [edition.id, edition]));
  const combinedEditions = BUNDLED_EDITIONS.map((bundled) => {
    const live = liveEditions.get(bundled.id);
    if (!live) return bundled;
    liveEditions.delete(bundled.id);
    return {
      ...bundled,
      ...live,
      displayTitle: live.displayTitle ?? bundled.displayTitle,
      dateLabel: live.dateLabel ?? bundled.dateLabel,
    };
  });
  const matchingEditions = [...combinedEditions, ...liveEditions.values()]
    .filter((edition) => edition.type === eventType)
    .sort((left, right) => left.startDate.localeCompare(right.startDate));
  return matchingEditions.find((edition) => edition.endDate >= dateKey)
    ?? matchingEditions.at(-1)
    ?? null;
}

export function EventSeasonProvider({ children }: PropsWithChildren) {
  const { profile } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [selectedEventType, setSelectedEventType] = useState<EventSeason>('diaknapok');
  const [previewEvent, setPreviewEventState] = useState<EventSeason | null>(null);
  const [editions, setEditions] = useState<EventEdition[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const canReadEventData = Boolean(profile?.isVerified || profile?.role === UserRole.FOSZERVEZO);

  useEffect(() => {
    let updateTimer: ReturnType<typeof setTimeout>;
    const scheduleMidnightUpdate = () => {
      const current = new Date();
      const nextMidnight = getNextRomanianMidnight(current).getTime();
      updateTimer = setTimeout(() => {
        setNow(new Date());
        scheduleMidnightUpdate();
      }, Math.max(0, nextMidnight - current.getTime() + 50));
    };
    scheduleMidnightUpdate();
    return () => clearTimeout(updateTimer);
  }, []);

  useEffect(() => {
    if (!canReadEventData) return undefined;
    return onSnapshot(
      collection(db, 'events'),
      (snapshot) => {
        try {
          const nextEditions = snapshot.docs
            .map((item) => toEventEdition(item.id, item.data()))
            .filter((edition): edition is EventEdition => edition !== null);
          setEditions(nextEditions);
          setError(null);
        } catch (cause) {
          setError(cause instanceof Error ? cause : new Error(String(cause)));
        } finally {
          setHasLoaded(true);
        }
      },
      (cause) => {
        setError(cause);
        setHasLoaded(true);
      },
    );
  }, [canReadEventData]);

  const setPreviewEvent = useCallback((event: EventSeason | null) => {
    if (profile?.role !== UserRole.FOSZERVEZO) {
      throw new Error('Only a head organizer can change the local event preview.');
    }
    setPreviewEventState(event);
  }, [profile?.role]);

  const setEventType = useCallback((event: EventSeason) => {
    setSelectedEventType(event);
  }, []);

  const actualEventType = getActiveEvent(now);
  const authorizedPreview = profile?.role === UserRole.FOSZERVEZO ? previewEvent : null;
  const eventType = authorizedPreview ?? selectedEventType;
  const selectedEdition = selectEdition(editions, eventType, now);
  const previewYear = Number(getRomanianDateKey(now).slice(0, 4))
    + (authorizedPreview === 'februtalis' && getRomanianDateKey(now).slice(5, 7) === '12' ? 1 : 0);
  const previewEdition: EventEdition | null = useMemo(
    () => authorizedPreview
      ? {
        id: `preview-${authorizedPreview}-${previewYear}`,
        type: authorizedPreview,
        editionYear: previewYear,
        title: authorizedPreview === 'februtalis' ? 'Februtális' : 'Diáknapok',
        titleEn: authorizedPreview === 'februtalis' ? 'Februtális' : 'Student Days',
        displayTitle: authorizedPreview === 'februtalis' ? 'FEBRUTÁLIS' : '28. MAROSVÁSÁRHELYI DIÁKNAPOK',
        dateLabel: '',
        startDate: '',
        endDate: '',
        startsAt: undefined,
        endsAt: undefined,
        published: false,
        theme: DEFAULT_EVENT_THEME,
      }
      : null,
    [authorizedPreview, previewYear],
  );
  const edition = canReadEventData
    ? authorizedPreview ? previewEdition : selectedEdition
    : null;
  const theme = edition?.theme ?? DEFAULT_EVENT_THEME;

  const value = useMemo(() => ({
    season: eventType,
    eventType,
    setEventType,
    actualEventType,
    edition,
    theme,
    isLoading: canReadEventData && !hasLoaded,
    error: canReadEventData ? error : null,
    previewEvent: authorizedPreview,
    isPreview: authorizedPreview !== null,
    setPreviewEvent,
  }), [actualEventType, authorizedPreview, canReadEventData, edition, error, eventType, hasLoaded, setEventType, setPreviewEvent, theme]);

  return <EventSeasonContext.Provider value={value}>{children}</EventSeasonContext.Provider>;
}

export function useEventSeason() {
  const context = useContext(EventSeasonContext);

  if (!context) {
    throw new Error('useEventSeason must be used within an EventSeasonProvider.');
  }

  return context;
}
