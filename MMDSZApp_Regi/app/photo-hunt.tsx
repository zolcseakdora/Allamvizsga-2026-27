import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { PhotoHuntScreen } from '@/src/screens/photo-hunt-screen';
import { usePhotoHunt } from '@/src/hooks/use-photo-hunt';
import { goBackOrHome } from '@/src/utils/navigation';
import { useEventSeason } from '@/src/context/EventSeasonContext';

export default function PhotoHuntRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { eventType } = useEventSeason();
  const { progress, uploadingTaskId, refresh, upload } = usePhotoHunt();

  useEffect(() => {
    if (eventType === 'februtalis') {
      router.replace('/games');
      return;
    }
    void refresh();
  }, [eventType, refresh, router]);

  const handleUpload = async (taskId: number) => {
    if (eventType === 'februtalis') {
      router.replace('/games');
      return;
    }
    try {
      await upload(taskId);
    } catch (error) {
      if (error instanceof Error && error.message === 'permission-required') {
        Alert.alert(t('alerts.permissionRequired'));
        return;
      }
      if (error instanceof Error && error.message === 'image-too-large') {
        Alert.alert(t('alerts.imageTooLarge'));
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    }
  };

  if (eventType === 'februtalis') return null;

  return (
    <PhotoHuntScreen
      progress={progress}
      uploadingTaskId={uploadingTaskId}
      onBack={() => goBackOrHome(router)}
      onRefresh={() => void refresh()}
      onUpload={handleUpload}
    />
  );
}
