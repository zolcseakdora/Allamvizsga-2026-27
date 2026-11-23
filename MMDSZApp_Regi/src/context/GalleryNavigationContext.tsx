import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import type { EventSeason } from '@/src/constants/event-schedule';

type GalleryNavigationContextValue = {
  folder: string | null;
  imageIds: string[];
  eventType: EventSeason | null;
  setImageIds: (folder: string, imageIds: string[], eventType?: EventSeason) => void;
};

const GalleryNavigationContext = createContext<GalleryNavigationContextValue | undefined>(undefined);

export function GalleryNavigationProvider({ children }: PropsWithChildren) {
  const [galleryNavigation, setGalleryNavigation] = useState<{
    folder: string | null;
    imageIds: string[];
    eventType: EventSeason | null;
  }>({
    folder: null,
    imageIds: [],
    eventType: null,
  });
  const setImageIds = useCallback((folder: string, imageIds: string[], eventType?: EventSeason) => {
    setGalleryNavigation({ folder, imageIds, eventType: eventType ?? null });
  }, []);
  const value = useMemo(
    () => ({ ...galleryNavigation, setImageIds }),
    [galleryNavigation, setImageIds],
  );

  return (
    <GalleryNavigationContext.Provider value={value}>
      {children}
    </GalleryNavigationContext.Provider>
  );
}

export function useGalleryNavigation() {
  const context = useContext(GalleryNavigationContext);
  if (!context) throw new Error('useGalleryNavigation must be used within GalleryNavigationProvider');
  return context;
}
