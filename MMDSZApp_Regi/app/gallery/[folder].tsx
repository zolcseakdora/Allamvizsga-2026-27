import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GalleryScreen } from '@/src/screens/gallery-screen';
import { useAuth } from '@/src/context/AuthContext';
import { useGalleryNavigation } from '@/src/context/GalleryNavigationContext';
import { useGallery } from '@/src/hooks/use-gallery';
import { goBackOrHome } from '@/src/utils/navigation';
import { useEventSeason } from '@/src/context/EventSeasonContext';
import { FEBRUTALIS_GALLERY_FOLDERS, GALLERY_FOLDERS } from '@/src/constants/gallery';

export default function GalleryFolderRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { folder } = useLocalSearchParams<{ folder: string }>();
  const { profile } = useAuth();
  const { eventType } = useEventSeason();
  const folders = eventType === 'februtalis' ? FEBRUTALIS_GALLERY_FOLDERS : GALLERY_FOLDERS;
  const { setImageIds } = useGalleryNavigation();
  const {
    images,
    imageCount,
    hasMoreImages,
    isLoadingMore,
    isUploading,
    refresh,
    loadMore,
    upload,
  } = useGallery(eventType);

  const showError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    Alert.alert(t('alerts.generic', { message }));
  }, [t]);

  useEffect(() => {
    if (folder) void refresh(folder).catch(showError);
  }, [folder, refresh, showError]);

  if (!folder || !folders.some((entry) => entry.id === folder)) return null;

  const handleUpload = async () => {
    try {
      const count = await upload(folder, profile?.name ?? '');
      if (count > 0) await refresh(folder);
    } catch (error) {
      if (error instanceof Error && error.message === 'image-too-large') {
        Alert.alert(t('alerts.imageTooLarge'));
        void refresh(folder).catch(showError);
        return;
      }
      if (error instanceof Error && error.message === 'permission-required') {
        Alert.alert(t('alerts.permissionRequired'));
        return;
      }
      showError(error);
    }
  };

  return (
    <GalleryScreen
      selectedFolder={folder}
      folders={folders}
      images={images}
      folderCounts={{}}
      imageCount={imageCount}
      hasMoreImages={hasMoreImages}
      isLoadingMore={isLoadingMore}
      isUploading={isUploading}
      onBack={() => goBackOrHome(router)}
      onRefresh={() => { void refresh(folder).catch(showError); }}
      onSelectFolder={() => undefined}
      onUploadImage={() => { void handleUpload(); }}
      onSelectImage={(image, imageIds) => {
        setImageIds(folder, imageIds, eventType);
        router.push({
          pathname: '/gallery/[folder]/[imageId]',
          params: { folder, imageId: image.id },
        });
      }}
      onLoadMore={() => { void loadMore(folder).catch(showError); }}
    />
  );
}
