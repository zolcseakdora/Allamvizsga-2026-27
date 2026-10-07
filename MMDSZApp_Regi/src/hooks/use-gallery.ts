import * as ImagePicker from 'expo-image-picker';
import { collection, doc, getDoc, getDocs, query, where, addDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';

import { auth, db } from '@/src/config/firebase';
import type { GalleryImage } from '@/src/types/gallery';

function toGalleryImage(id: string, data: Record<string, unknown>): GalleryImage | null {
  if (typeof data.image !== 'string' || data.image.length <= 10) return null;

  return {
    id,
    image: data.image,
    category: typeof data.category === 'string' ? data.category : undefined,
    uploadedBy: typeof data.uploadedBy === 'string' ? data.uploadedBy : undefined,
  };
}

export function useGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);

  const refresh = useCallback(async (folder: string) => {
    const snapshot = await getDocs(query(collection(db, 'gallery'), where('category', '==', folder)));
    setImages(snapshot.docs
      .map((item) => toGalleryImage(item.id, item.data()))
      .filter((item): item is GalleryImage => item !== null));
  }, []);

  const getImage = useCallback(async (imageId: string) => {
    const snapshot = await getDoc(doc(db, 'gallery', imageId));
    return snapshot.exists() ? toGalleryImage(snapshot.id, snapshot.data()) : null;
  }, []);

  const upload = useCallback(async (folder: string, uploadedBy: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('permission-required');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.15,
      base64: true,
    });

    if (result.canceled || !auth.currentUser) return 0;

    let uploadedCount = 0;
    for (const asset of result.assets) {
      if (!asset.base64) continue;

      const image = `data:image/jpeg;base64,${asset.base64}`;
      if (image.length > 1000000) continue;

      await addDoc(collection(db, 'gallery'), {
        image,
        category: folder,
        uploadedBy: uploadedBy || 'Névtelen',
        createdAt: new Date(),
      });
      uploadedCount += 1;
    }

    return uploadedCount;
  }, []);

  return { images, refresh, getImage, upload };
}
