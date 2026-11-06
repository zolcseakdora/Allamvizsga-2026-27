import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { RegisteredUsersScreen } from '@/src/screens/registered-users-screen';
import { useAdmin } from '@/src/hooks/use-admin';
import { useAuth } from '@/src/context/AuthContext';
import { UserRole } from '@/src/types/auth';
import { canRole } from '@/src/constants/roles';
import { goBackOrHome } from '@/src/utils/navigation';

export default function RegisteredUsersRoute() {
  const router = useRouter();
  const { profile, isLoading } = useAuth();
  const { registeredUsers, refreshRegisteredUsers, reviewRegistration } = useAdmin();
  const [reviewingUserId, setReviewingUserId] = useState<string>();
  const canView = canRole(profile?.role, 'manageUsers');
  const canReview = profile?.role === UserRole.FOSZERVEZO && profile?.accountStatus !== 'disabled';

  useEffect(() => {
    if (!isLoading && !canView) router.replace('/');
  }, [isLoading, canView, router]);

  useEffect(() => {
    if (!isLoading && canView) {
      void refreshRegisteredUsers().catch((error: unknown) => console.error('Registered users refresh failed:', error));
    }
  }, [isLoading, canView, refreshRegisteredUsers]);

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

  if (isLoading || !canView) return null;
  return (
    <RegisteredUsersScreen
      users={registeredUsers}
      onBack={() => goBackOrHome(router)}
      onRefresh={() => void refreshRegisteredUsers().catch((error: unknown) => showMessage('Hiba', String(error)))}
      canReviewRegistrations={canReview}
      reviewingUserId={reviewingUserId}
      onReviewRegistration={handleReview}
    />
  );
}
