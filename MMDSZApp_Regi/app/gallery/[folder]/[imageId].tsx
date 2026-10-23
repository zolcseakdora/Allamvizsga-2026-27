import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GalleryImageScreen } from '@/src/screens/gallery-image-screen';
import { useAuth } from '@/src/context/AuthContext';
import { useGalleryNavigation } from '@/src/context/GalleryNavigationContext';
import { useGallery } from '@/src/hooks/use-gallery';
import { canRole } from '@/src/constants/roles';
import type { GalleryImage } from '@/src/types/gallery';
import { goBackOrHome } from '@/src/utils/navigation';

export default function GalleryImageRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { folder, imageId } = useLocalSearchParams<{
    folder: string;
    imageId: string;
  }>();
  const { profile } = useAuth();
  const galleryNavigation = useGalleryNavigation();
  const { getImage, deleteImage } = useGallery();
  const [loadResult, setLoadResult] = useState<{
    imageId: string;
    image: GalleryImage | null;
    error?: string;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const canManageGallery = canRole(profile?.role, 'manageGallery');
  const currentLoadResult = loadResult?.imageId === imageId ? loadResult : null;
  const image = currentLoadResult?.image ?? null;
  const loadError = currentLoadResult?.error ?? null;
  const isLoading = Boolean(imageId) && currentLoadResult === null;
  const imageIdList = useMemo(() => {
    const folderImageIds = galleryNavigation.folder === folder ? galleryNavigation.imageIds : [];
    return folderImageIds.length > 0 ? folderImageIds : imageId ? [imageId] : [];
  }, [folder, galleryNavigation.folder, galleryNavigation.imageIds, imageId]);
  const currentIndex = imageIdList.indexOf(imageId);

  useEffect(() => {
    if (!imageId) return;

    let isActive = true;
    let didTimeout = false;
    const timeout = setTimeout(() => {
      didTimeout = true;
      const timeoutError = new Error('Gallery image load timed out after 10000ms');
      console.error('Failed to load gallery image', timeoutError);
      setLoadResult({
        imageId,
        image: null,
        error: t('galleryImage.timeoutError'),
      });
    }, 10000);

    void getImage(imageId).then((nextImage) => {
      if (isActive && !didTimeout) setLoadResult({ imageId, image: nextImage });
    }).catch((error: unknown) => {
      console.error('Failed to load gallery image', error);
      if (isActive && !didTimeout) {
        setLoadResult({
          imageId,
          image: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }).finally(() => {
      clearTimeout(timeout);
    });

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [getImage, imageId, retryCount, t]);

  const handleRetry = useCallback(() => {
    setLoadResult(null);
    setRetryCount(count => count + 1);
  }, []);

  const navigateToImage = useCallback((targetId: string) => {
    if (!folder) return;
    router.replace({
      pathname: '/gallery/[folder]/[imageId]',
      params: { folder, imageId: targetId },
    });
  }, [folder, router]);

  const handleDelete = useCallback(async () => {
    if (!canManageGallery || !imageId || !folder) return;
    try {
      await deleteImage(imageId);
      router.replace({ pathname: '/gallery/[folder]', params: { folder } });
    } catch (error) {
      console.error('Failed to delete gallery image', error);
      setLoadResult({
        imageId,
        image,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [canManageGallery, deleteImage, folder, image, imageId, router]);

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('galleryImage.confirmDelete'))) void handleDelete();
      return;
    }

    Alert.alert(t('galleryImage.delete'), t('galleryImage.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('galleryImage.delete'), style: 'destructive', onPress: () => { void handleDelete(); } },
    ]);
  };

  const handleDownload = (imageBase64: string) => {
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = imageBase64;
      link.download = `diaknapok_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    Linking.openURL(imageBase64).catch(() => Alert.alert(t('alerts.downloadFailed')));
  };

  return (
    <GalleryImageScreen
      image={image}
      isLoading={isLoading}
      error={loadError}
      onRetry={handleRetry}
      canManageGallery={canManageGallery}
      hasPrevious={currentIndex > 0}
      hasNext={currentIndex >= 0 && currentIndex < imageIdList.length - 1}
      onBack={() => goBackOrHome(router)}
      onPrevious={() => {
        if (currentIndex > 0) navigateToImage(imageIdList[currentIndex - 1]);
      }}
      onNext={() => {
        if (currentIndex >= 0 && currentIndex < imageIdList.length - 1) {
          navigateToImage(imageIdList[currentIndex + 1]);
        }
      }}
      onDownloadImage={handleDownload}
      onDeleteImage={confirmDelete}
    />
  );
}
