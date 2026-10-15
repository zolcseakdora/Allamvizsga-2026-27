import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '@/src/config/firebase';

const localNotificationIds = new Set<string>();

export function isLocallyCreatedNotification(id: string) {
  return localNotificationIds.has(id);
}

export async function createNotification(
  title: string,
  body: string,
  createdBy: string,
  createdByName: string,
) {
  const notificationRef = doc(collection(db, 'notifications'));
  localNotificationIds.add(notificationRef.id);
  if (localNotificationIds.size > 200) {
    const oldestId = localNotificationIds.values().next().value;
    if (oldestId) localNotificationIds.delete(oldestId);
  }

  try {
    await setDoc(notificationRef, {
      title,
      body,
      createdAt: serverTimestamp(),
      createdBy,
      createdByName,
    });
  } catch (error) {
    localNotificationIds.delete(notificationRef.id);
    throw error;
  }
}
