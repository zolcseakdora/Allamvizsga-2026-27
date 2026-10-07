import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { PhotoHuntScreen } from '@/src/screens/photo-hunt-screen';
import { usePhotoHunt } from '@/src/hooks/use-photo-hunt';

export default function PhotoHuntRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { progress, refresh, upload } = usePhotoHunt();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleUpload = async (taskId: number) => {
    try {
      await upload(taskId);
    } catch (error) {
      const message = error instanceof Error && error.message === 'permission-required'
        ? t('alerts.permissionRequired')
        : error instanceof Error && error.message === 'photo-too-large'
          ? t('alerts.photoTooLarge')
          : error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    }
  };

  return (
    <PhotoHuntScreen
      progress={progress}
      onBack={() => router.back()}
      onRefresh={() => void refresh()}
      onUpload={handleUpload}
    />
  );
}
