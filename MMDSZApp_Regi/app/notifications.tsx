import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useNotifications } from '@/src/hooks/use-notifications';
import { useToast } from '@/src/context/ToastContext';
import { NotificationsScreen } from '@/src/screens/notifications-screen';
import type { Notification } from '@/src/hooks/use-notifications';

export default function NotificationsRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const {
    notifications,
    unreadNotificationIds,
    canRead,
    canSend,
    isLoading,
    error,
    markAllSeen,
    sendNotification,
    deleteNotification,
  } = useNotifications();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    void markAllSeen().catch((cause: unknown) => {
      const message = cause instanceof Error ? cause.message : String(cause);
      showToast(t('notifications.markSeenError', { message }), 'error');
    });
  }, [markAllSeen, showToast, t]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      showToast(t('notifications.fieldsRequired'), 'error');
      return;
    }
    setIsSending(true);
    try {
      await sendNotification(title.trim(), body.trim());
      setTitle('');
      setBody('');
      showToast(t('notifications.sentSuccess'), 'success');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      showToast(t('alerts.generic', { message }), 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (notification: Notification) => {
    try {
      await deleteNotification(notification.id);
      showToast(t('notifications.deletedSuccess'), 'success');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      showToast(t('alerts.generic', { message }), 'error');
    }
  };

  return (
    <NotificationsScreen
      notifications={notifications}
      unreadNotificationIds={unreadNotificationIds}
      canRead={canRead}
      canSend={canSend}
      isLoading={isLoading}
      error={error}
      title={title}
      body={body}
      isSending={isSending}
      onBack={() => router.back()}
      onTitleChange={setTitle}
      onBodyChange={setBody}
      onSend={() => void handleSend()}
      onDelete={(notification) => void handleDelete(notification)}
    />
  );
}
