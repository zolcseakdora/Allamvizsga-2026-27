import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GalleryScreen } from '@/src/screens/gallery-screen';
import { useGallery } from '@/src/hooks/use-gallery';
import { goBackOrHome } from '@/src/utils/navigation';

export default function GalleryRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { getFolderCounts } = useGallery();
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    void getFolderCounts().then(setFolderCounts).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    });
  }, [getFolderCounts, t]);

  return (
    <GalleryScreen
      selectedFolder={null}
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
