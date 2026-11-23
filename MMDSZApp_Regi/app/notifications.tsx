import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useNotifications } from '@/src/hooks/use-notifications';
import { useToast } from '@/src/context/ToastContext';
import { NotificationsScreen } from '@/src/screens/notifications-screen';
import { goBackOrHome } from '@/src/utils/navigation';

export default function NotificationsRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const {
    notifications,
    unreadNotificationIds,
    canRead,
    isLoading,
    error,
    markAllSeen,
  } = useNotifications();

  useEffect(() => {
    void markAllSeen().catch((cause: unknown) => {
      const message = cause instanceof Error ? cause.message : String(cause);
      showToast(t('notifications.markSeenError', { message }), 'error');
    });
  }, [markAllSeen, showToast, t]);

  return (
    <NotificationsScreen
      notifications={notifications}
      unreadNotificationIds={unreadNotificationIds}
      canRead={canRead}
      isLoading={isLoading}
      error={error}
      onBack={() => goBackOrHome(router)}
    />
  );
}
