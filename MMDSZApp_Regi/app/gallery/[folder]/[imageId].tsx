import { useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GalleryImageScreen } from '@/src/screens/gallery-image-screen';
import { useGallery } from '@/src/hooks/use-gallery';
import type { GalleryImage } from '@/src/types/gallery';

export default function GalleryImageRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { imageId } = useLocalSearchParams<{ imageId: string }>();
  const { getImage } = useGallery();
  const [image, setImage] = useState<GalleryImage | null>(null);

  useEffect(() => {
    if (!imageId) return;

    let isActive = true;
    void getImage(imageId).then((nextImage) => {
      if (isActive) setImage(nextImage);
    });

    return () => {
      isActive = false;
    };
  }, [getImage, imageId]);

  if (!image) return null;

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
      onBack={() => router.back()}
      onDownloadImage={handleDownload}
    />
  );
}
