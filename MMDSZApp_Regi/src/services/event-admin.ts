import { getFunctions, httpsCallable } from 'firebase/functions';

import { auth } from '@/src/config/firebase';

const functions = getFunctions(auth.app);

export async function deleteEventDay(eventId: string, dayId: string) {
  const removeDay = httpsCallable<{ eventId: string; dayId: string }, void>(
    functions,
    'deleteEventDay',
  );
  await removeDay({ eventId, dayId });
}
