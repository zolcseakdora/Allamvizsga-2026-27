import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GalleryScreen } from '@/src/screens/gallery-screen';
import { useAuth } from '@/src/context/AuthContext';
import { useGallery } from '@/src/hooks/use-gallery';

export default function GalleryFolderRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { folder } = useLocalSearchParams<{ folder: string }>();
  const { profile } = useAuth();
  const { images, refresh, upload } = useGallery();

  useEffect(() => {
    if (folder) void refresh(folder);
  }, [folder, refresh]);

  if (!folder) return null;

  const handleUpload = async () => {
    try {
      const count = await upload(folder, profile?.name ?? '');
      if (count > 0) await refresh(folder);
    } catch (error) {
      const message = error instanceof Error && error.message === 'permission-required'
        ? t('alerts.permissionRequired')
        : error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    }
  };

  return (
    <GalleryScreen
      selectedFolder={folder}
      images={images}
      onBack={() => router.back()}
      onRefresh={() => void refresh(folder)}
      onSelectFolder={() => undefined}
      onUploadImage={() => void handleUpload()}
      onSelectImage={(image) => router.push({ pathname: '/gallery/[folder]/[imageId]', params: { folder, imageId: image.id } })}
    />
  );
}
