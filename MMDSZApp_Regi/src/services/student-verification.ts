import { doc, collection } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { auth, db, storage } from '@/src/config/firebase';
import type { EventSeason } from '@/src/constants/event-schedule';

const functions = getFunctions(auth.app);

export async function uploadStudentVerification(
  uri: string,
  uid: string,
  eventType: EventSeason,
) {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('The processed verification image could not be read.');
  }
  const imageBlob = await response.blob();
  const fileId = doc(collection(db, 'student-verifications')).id;
  const storagePath = `student-verifications/${uid}/${eventType}/${fileId}.jpg`;
  await uploadBytes(ref(storage, storagePath), imageBlob, { contentType: 'image/jpeg' });

  const submit = httpsCallable<
    { eventType: EventSeason; storagePath: string },
    { imageUrl: string }
  >(functions, 'submitStudentVerification');
  const result = await submit({ eventType, storagePath });
  return result.data.imageUrl;
}
