import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GalleryScreen } from '@/src/screens/gallery-screen';
import { useGallery } from '@/src/hooks/use-gallery';
import { FEBRUTALIS_GALLERY_FOLDERS, GALLERY_FOLDERS } from '@/src/constants/gallery';
import { useEventSeason } from '@/src/context/EventSeasonContext';
import { goBackOrHome } from '@/src/utils/navigation';

export default function GalleryRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { eventType } = useEventSeason();
  const { getFolderCounts } = useGallery(eventType);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const folders = eventType === 'februtalis' ? FEBRUTALIS_GALLERY_FOLDERS : GALLERY_FOLDERS;

  useEffect(() => {
    void getFolderCounts().then(setFolderCounts).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    });
  }, [getFolderCounts, t]);

  return (
    <GalleryScreen
      selectedFolder={null}
      folders={folders}
      images={[]}
      folderCounts={folderCounts}
      imageCount={0}
      hasMoreImages={false}
      isLoadingMore={false}
      isUploading={false}
      onBack={() => goBackOrHome(router)}
      onRefresh={() => undefined}
      onSelectFolder={(folder) => router.push({ pathname: '/gallery/[folder]', params: { folder } })}
      onUploadImage={() => undefined}
      onSelectImage={() => undefined}
      onLoadMore={() => undefined}
    />
  );
}
