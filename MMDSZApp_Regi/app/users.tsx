import { Alert } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RegisteredUsersScreen } from '@/src/screens/registered-users-screen';
import { useAdmin } from '@/src/hooks/use-admin';
import { goBackOrHome } from '@/src/utils/navigation';
import { useEventSeason } from '@/src/context/EventSeasonContext';
import { useToast } from '@/src/context/ToastContext';

export default function RegisteredUsersRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  const { registeredUsers, refreshRegisteredUsers, assignFebrutalisTeamCaptain } = useAdmin();
  const { eventType } = useEventSeason();
  const { showToast } = useToast();
  const [loadState, setLoadState] = useState<{
    eventType: typeof eventType | null;
    status: 'loading' | 'loaded' | 'error';
    error?: string;
  }>({ eventType: null, status: 'loading' });

  const loadUsers = useCallback(async (targetEventType: typeof eventType) => {
    setLoadState({ eventType: targetEventType, status: 'loading' });
    try {
      await refreshRegisteredUsers(targetEventType);
      setLoadState({ eventType: targetEventType, status: 'loaded' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLoadState({ eventType: targetEventType, status: 'error', error: message });
    }
  }, [refreshRegisteredUsers]);

  useEffect(() => {
    let isCurrent = true;
    void refreshRegisteredUsers(eventType)
      .then(() => {
        if (isCurrent) setLoadState({ eventType, status: 'loaded' });
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        const message = error instanceof Error ? error.message : String(error);
        setLoadState({ eventType, status: 'error', error: message });
      });

    return () => {
      isCurrent = false;
    };
  }, [eventType, refreshRegisteredUsers]);

  const handleAssignCaptain = (teamKey: string, captainUid: string, captainName: string) => {
    Alert.alert(t('admin.confirmFebrutalisCaptain', { name: captainName }), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.assignFebrutalisCaptain'),
        onPress: () => {
          void (async () => {
            try {
              await assignFebrutalisTeamCaptain(teamKey, captainUid);
              showToast(t('admin.februtalisCaptainAssigned'), 'success');
              await loadUsers(eventType);
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              showToast(t('alerts.generic', { message }), 'error');
            }
          })();
        },
      },
    ]);
  };

  const hasCurrentEventState = loadState.eventType === eventType;

  return (
    <RegisteredUsersScreen
      users={hasCurrentEventState && loadState.status === 'loaded' ? registeredUsers : []}
      eventType={eventType}
      isLoading={!hasCurrentEventState || loadState.status === 'loading'}
      error={hasCurrentEventState && loadState.status === 'error' ? loadState.error ?? null : null}
      onBack={() => goBackOrHome(router)}
      onRefresh={() => void loadUsers(eventType)}
      onAssignCaptain={handleAssignCaptain}
    />
  );
}
