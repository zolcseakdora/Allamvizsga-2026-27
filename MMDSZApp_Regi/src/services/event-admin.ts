import { httpsCallable } from 'firebase/functions';

import { functions } from '@/src/config/firebase';

export type FebrutalisRegistration = {
  uid?: string;
  teamName?: string;
  teamKey?: string;
};

export async function deleteEventDay(eventId: string, dayId: string) {
  const removeDay = httpsCallable<{ eventId: string; dayId: string }, void>(
    functions,
    'deleteEventDay',
  );
  await removeDay({ eventId, dayId });
}

export async function assignFebrutalisTeamCaptain(teamKey: string, captainUid: string) {
  const assignCaptain = httpsCallable<
    { teamKey: string; captainUid: string },
    { teamId: string; captainUid: string }
  >(functions, 'registerFebrutalisTeam');
  const result = await assignCaptain({ teamKey, captainUid });
  return result.data;
}

export async function listFebrutalisRegistrations() {
  const listRegistrations = httpsCallable<
    void,
    { registrations: FebrutalisRegistration[] }
  >(functions, 'listFebrutalisRegistrations');
  const result = await listRegistrations();
  return result.data.registrations;
}
