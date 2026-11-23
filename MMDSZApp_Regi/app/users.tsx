import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RegisteredUsersScreen } from '@/src/screens/registered-users-screen';
import { useAdmin } from '@/src/hooks/use-admin';
import { useAuth } from '@/src/context/AuthContext';
import { UserRole } from '@/src/types/auth';
import { canRole } from '@/src/constants/roles';
import { goBackOrHome } from '@/src/utils/navigation';
import { useEventSeason } from '@/src/context/EventSeasonContext';
import { useToast } from '@/src/context/ToastContext';

export default function RegisteredUsersRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, isLoading } = useAuth();
  const {
    registeredUsers,
    refreshRegisteredUsers,
    reviewRegistration,
    assignFebrutalisTeamCaptain,
  } = useAdmin();
  const { eventType } = useEventSeason();
  const { showToast } = useToast();
  const [reviewingUserId, setReviewingUserId] = useState<string>();
  const canView = canRole(profile?.role, 'manageUsers');
  const canReview = profile?.role === UserRole.FOSZERVEZO && profile?.accountStatus !== 'disabled';
  const [loadState, setLoadState] = useState<{
    eventType: typeof eventType | null;
    status: 'loading' | 'loaded' | 'error';
    error?: string;
  }>({ eventType: null, status: 'loading' });

  useEffect(() => {
    if (!isLoading && !canView) router.replace('/');
  }, [isLoading, canView, router]);

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
    if (isLoading || !canView) return;
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
  }, [canView, eventType, isLoading, refreshRegisteredUsers]);

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}\n${message}`);
    else Alert.alert(title, message);
  };

  const handleReview = (userId: string, approved: boolean) => {
    if (!canReview || reviewingUserId) return;
    const perform = async () => {
      setReviewingUserId(userId);
      try {
        await reviewRegistration(userId, approved);
        await loadUsers(eventType);
        showMessage('Regisztráció', approved ? 'A regisztrációt jóváhagytad.' : 'A regisztrációt elutasítottad.');
      } catch (error) {
        showMessage('Hiba', error instanceof Error ? error.message : String(error));
      } finally {
        setReviewingUserId(undefined);
      }
    };
    const confirmation = approved ? 'Jóváhagyod a felhasználó regisztrációját?' : 'Biztosan elutasítod a regisztrációját?';
    if (Platform.OS === 'web') {
      if (window.confirm(confirmation)) void perform();
      return;
    }
    Alert.alert('Regisztráció elbírálása', confirmation, [
      { text: 'Mégse', style: 'cancel' },
      { text: approved ? 'Jóváhagyás' : 'Elutasítás', style: approved ? 'default' : 'destructive', onPress: () => void perform() },
    ]);
  };

  const handleAssignCaptain = (teamKey: string, captainUid: string, captainName: string) => {
    const assign = async () => {
      try {
        await assignFebrutalisTeamCaptain(teamKey, captainUid);
        showToast(t('admin.februtalisCaptainAssigned'), 'success');
        await loadUsers(eventType);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showToast(t('alerts.generic', { message }), 'error');
      }
    };
    const confirmation = t('admin.confirmFebrutalisCaptain', { name: captainName });
    if (Platform.OS === 'web') {
      if (window.confirm(confirmation)) void assign();
      return;
    }
    Alert.alert(confirmation, '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('admin.assignFebrutalisCaptain'), onPress: () => void assign() },
    ]);
  };

  const hasCurrentEventState = loadState.eventType === eventType;

  if (isLoading || !canView) return null;
  return (
    <RegisteredUsersScreen
      users={hasCurrentEventState && loadState.status === 'loaded' ? registeredUsers : []}
      eventType={eventType}
      isLoading={!hasCurrentEventState || loadState.status === 'loading'}
      error={hasCurrentEventState && loadState.status === 'error' ? loadState.error ?? null : null}
      onBack={() => goBackOrHome(router)}
      onRefresh={() => void loadUsers(eventType)}
      canReviewRegistrations={canReview}
      reviewingUserId={reviewingUserId}
      onReviewRegistration={handleReview}
      onAssignCaptain={handleAssignCaptain}
    />
  );
}
