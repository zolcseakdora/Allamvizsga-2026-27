import * as ImagePicker from 'expo-image-picker';
import { collection, doc, getDocs, query, setDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';

import { auth, db } from '@/src/config/firebase';
import { processImage } from '@/src/services/images';

export function usePhotoHunt() {
  const [progress, setProgress] = useState<Record<number, boolean>>({});
  const [uploadingTaskId, setUploadingTaskId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!auth.currentUser) return;

    const snapshot = await getDocs(query(collection(db, 'photohunt_uploads')));
    const nextProgress: Record<number, boolean> = {};
    snapshot.docs.forEach((item) => {
      const data = item.data();
      if (data.userId === auth.currentUser?.uid && typeof data.taskId === 'number') {
        nextProgress[data.taskId] = true;
      }
    });
    setProgress(nextProgress);
  }, []);

  const upload = useCallback(async (taskId: number) => {
    const uid = auth.currentUser?.uid;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('permission-required');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: false,
    });

    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (!uri || !uid) return;

    setUploadingTaskId(taskId);
    try {
      const { dataUrl: file } = await processImage(uri, { maxSide: 1600, quality: 0.7, maxBytes: 700000 });

      await setDoc(doc(db, 'photohunt_uploads', `${uid}_${taskId}`), {
        taskId,
        userId: uid,
        file,
        uploadedAt: new Date(),
      });
      setProgress((currentProgress) => ({ ...currentProgress, [taskId]: true }));
    } finally {
      setUploadingTaskId(null);
    }
  }, []);

  return { progress, uploadingTaskId, refresh, upload };
}
