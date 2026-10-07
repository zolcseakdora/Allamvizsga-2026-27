import * as ImagePicker from 'expo-image-picker';
import { collection, doc, getDocs, query, setDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';

import { auth, db } from '@/src/config/firebase';

export function usePhotoHunt() {
  const [progress, setProgress] = useState<Record<number, boolean>>({});

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
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('permission-required');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.1,
      base64: true,
    });

    const base64 = result.canceled ? undefined : result.assets[0]?.base64;
    if (!base64 || !auth.currentUser) return;

    const file = `data:image/jpeg;base64,${base64}`;
    if (file.length > 1000000) throw new Error('photo-too-large');

    await setDoc(doc(db, 'photohunt_uploads', `${auth.currentUser.uid}_${taskId}`), {
      taskId,
      userId: auth.currentUser.uid,
      file,
      uploadedAt: new Date(),
    });
    setProgress((currentProgress) => ({ ...currentProgress, [taskId]: true }));
  }, []);

  return { progress, refresh, upload };
}
