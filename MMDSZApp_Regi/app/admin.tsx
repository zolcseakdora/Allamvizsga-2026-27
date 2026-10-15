import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AdminDashboardScreen } from '@/src/screens/admin-dashboard-screen';
import { useAdmin } from '@/src/hooks/use-admin';
import { useAuth } from '@/src/context/AuthContext';
import { canRole } from '@/src/constants/roles';
import { goBackOrHome } from '@/src/utils/navigation';

export default function AdminRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const canManageAdmin = canRole(profile?.role, 'manageAdmin');
  const {
    pendingUsers,
    refreshPendingUsers,
    approveUser,
    addEvent,
    sendNotification,
  } = useAdmin();

  const [adminEventDay, setAdminEventDay] = useState('Szerda');
  const [adminEventTitle, setAdminEventTitle] = useState('');
  const [adminEventTime, setAdminEventTime] = useState('');
  const [adminEventLocation, setAdminEventLocation] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showPending, setShowPending] = useState(false);

  useEffect(() => {
    if (profile && !canManageAdmin) router.replace('/');
  }, [canManageAdmin, profile, router]);

  const handleAddEvent = async () => {
    if (!adminEventTitle || !adminEventTime || !adminEventLocation) {
      Alert.alert(t('alerts.fillProgramFields'));
      return;
    }

    setIsUploading(true);
    try {
      await addEvent({ title: adminEventTitle, time: adminEventTime, location: adminEventLocation, day: adminEventDay });
      setAdminEventTitle('');
      setAdminEventTime('');
      setAdminEventLocation('');
      Alert.alert(t('alerts.programAdded', { day: adminEventDay }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle || !notifBody) {
      Alert.alert(t('alerts.notificationRequired'));
      return;
    }

    try {
      await sendNotification(notifTitle, notifBody);
      setNotifTitle('');
      setNotifBody('');
      Alert.alert(t('alerts.notificationSent'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    }
  };

  const handleFetchPending = async () => {
    await refreshPendingUsers();
    setShowPending(true);
  };

  const handleApprove = async (userId: string) => {
    try {
      await approveUser(userId);
      Alert.alert(t('alerts.idApproved'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    }
  };

  if (!canManageAdmin) return null;

  return (
    <AdminDashboardScreen
      adminEventDay={adminEventDay}
      adminEventTitle={adminEventTitle}
      adminEventTime={adminEventTime}
      adminEventLocation={adminEventLocation}
      isUploading={isUploading}
      notifTitle={notifTitle}
      notifBody={notifBody}
      showPending={showPending}
      pendingUsers={pendingUsers}
      onBack={() => goBackOrHome(router)}
      onEventDayChange={setAdminEventDay}
      onEventTitleChange={setAdminEventTitle}
      onEventTimeChange={setAdminEventTime}
      onEventLocationChange={setAdminEventLocation}
      onAddEvent={handleAddEvent}
      onNotifTitleChange={setNotifTitle}
      onNotifBodyChange={setNotifBody}
      onSendNotification={handleSendNotification}
      onFetchPendingUsers={() => void handleFetchPending()}
      onApproveUser={(userId) => void handleApprove(userId)}
      onOpenPrograms={() => router.push('/schedule')}
      onOpenUsers={() => router.push('/users')}
      onOpenInvites={() => router.push('/invites')}
    />
  );
}
