import { doc, collection } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { auth, db } from '@/src/config/firebase';
import type { EventSeason } from '@/src/constants/event-schedule';

export type NotificationAudience = 'everyone' | 'captains' | 'organizers';

const localNotificationIds = new Set<string>();
const functions = getFunctions(auth.app);

export function isLocallyCreatedNotification(id: string) {
  return localNotificationIds.has(id);
}

export async function createNotification(
  title: string,
  body: string,
  eventType: EventSeason,
  audience: NotificationAudience,
) {
  const notificationRef = doc(collection(db, 'notifications'));
  localNotificationIds.add(notificationRef.id);
  if (localNotificationIds.size > 200) {
    const oldestId = localNotificationIds.values().next().value;
    if (oldestId) localNotificationIds.delete(oldestId);
  }

  try {
    const publish = httpsCallable<
      {
        title: string;
        body: string;
        eventType: EventSeason;
        audience: NotificationAudience;
        notificationId: string;
      },
      { notificationId: string }
    >(functions, 'publishNotification');
    await publish({
      title,
      body,
      eventType,
      audience,
      notificationId: notificationRef.id,
    });
  } catch (error) {
    localNotificationIds.delete(notificationRef.id);
    throw error;
  }
}
