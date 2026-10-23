import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';

type GalleryNavigationContextValue = {
  folder: string | null;
  imageIds: string[];
  setImageIds: (folder: string, imageIds: string[]) => void;
};

const GalleryNavigationContext = createContext<GalleryNavigationContextValue | undefined>(undefined);

export function GalleryNavigationProvider({ children }: PropsWithChildren) {
  const [galleryNavigation, setGalleryNavigation] = useState<{ folder: string | null; imageIds: string[] }>({
    folder: null,
    imageIds: [],
  });
  const setImageIds = useCallback((folder: string, imageIds: string[]) => {
    setGalleryNavigation({ folder, imageIds });
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
