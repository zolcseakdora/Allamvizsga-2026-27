import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Share } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AdminDashboardScreen } from '@/src/screens/admin-dashboard-screen';
import { useAdmin } from '@/src/hooks/use-admin';
import { useAuth } from '@/src/context/AuthContext';
import { functions } from '@/src/config/firebase';
import { useToast } from '@/src/context/ToastContext';
import { canRole } from '@/src/constants/roles';
import { makeThumbnail, processImage } from '@/src/services/images';
import { EVENT_DAYS } from '@/src/constants/event-days';
import { usePrograms } from '@/src/hooks/use-programs';
import type { Team } from '@/src/types/team';
import { goBackOrHome } from '@/src/utils/navigation';

export default function AdminRoute() {
  const router = useRouter();
  const { section, programId } = useLocalSearchParams<{ section?: string; programId?: string }>();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { profile, isLoading } = useAuth();
  const { getProgram } = usePrograms();
  const canManageAdmin = canRole(profile?.role, 'manageAdmin');
  const {
    pendingUsers,
    refreshPendingUsers,
    approveUser,
    addEvent,
    sendNotification,
    teams,
    refreshTeams,
    deleteTeam,
    normalizeUserTeamNames,
  } = useAdmin();

  const [adminEventDay, setAdminEventDay] = useState('Szerda');
  const [adminEventTitle, setAdminEventTitle] = useState('');
  const [adminEventTime, setAdminEventTime] = useState('');
  const [adminEventLocation, setAdminEventLocation] = useState('');
  const [adminEventDescription, setAdminEventDescription] = useState('');
  const [adminEventImage, setAdminEventImage] = useState<string>();
  const [eventImagePayload, setEventImagePayload] = useState<{ image: string; thumb: string }>();
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [captainCode, setCaptainCode] = useState('');
  const [captainCodeActive, setCaptainCodeActive] = useState(false);
  const [captainCodeExpiresAt, setCaptainCodeExpiresAt] = useState<string | null>(null);
  const [captainCodeLoading, setCaptainCodeLoading] = useState(false);

  const refreshCaptainCodeStatus = useCallback(async () => {
    const getStatus = httpsCallable<void, { active: boolean; expiresAt: string | null }>(
      functions, 'getCaptainRegistrationCodeStatus',
    );
    const result = await getStatus();
    setCaptainCodeActive(result.data.active);
    setCaptainCodeExpiresAt(result.data.expiresAt);
    if (!result.data.active) setCaptainCode('');
  }, []);

  useEffect(() => {
    if (isLoading || !canManageAdmin) return;
    void refreshCaptainCodeStatus().catch((error: unknown) => {
      console.error('Kapitányi kód állapotának lekérése sikertelen', error);
    });
  }, [canManageAdmin, isLoading, refreshCaptainCodeStatus]);

  const handleGenerateCaptainCode = async () => {
    if (captainCodeLoading || captainCodeActive) return;
    setCaptainCodeLoading(true);
    try {
      const createCode = httpsCallable<void, { code: string; expiresAt: string }>(
        functions, 'createCaptainRegistrationCode',
      );
      const response = await createCode();
      setCaptainCode(response.data.code);
      setCaptainCodeExpiresAt(response.data.expiresAt);
      setCaptainCodeActive(true);
      showToast('A közös kapitányi kód létrejött. Másold ki most: később már nem jeleníthető meg.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(`Nem sikerült létrehozni a kódot: ${message}`, 'error');
      await refreshCaptainCodeStatus().catch(() => {});
    } finally {
      setCaptainCodeLoading(false);
    }
  };

  const handleRevokeCaptainCode = async () => {
    if (captainCodeLoading || !captainCodeActive) return;
    if (Platform.OS === 'web' && !window.confirm('Biztosan visszavonod a közös kapitányi kódot?')) return;
    setCaptainCodeLoading(true);
    try {
      const revoke = httpsCallable<void, { status: 'revoked' }>(
        functions, 'revokeCaptainRegistrationCode',
      );
      await revoke();
      setCaptainCode('');
      setCaptainCodeActive(false);
      setCaptainCodeExpiresAt(null);
      showToast('A közös kapitányi kód visszavonva.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(`Nem sikerült visszavonni a kódot: ${message}`, 'error');
    } finally {
      setCaptainCodeLoading(false);
    }
  };

  const handleCopyCaptainCode = async () => {
    if (!captainCode) return;
    try {
      if (Platform.OS === 'web') {
        if (!navigator.clipboard) {
          showToast('A kódot jelöld ki és másold ki kézzel.', 'error');
          return;
        }
        await navigator.clipboard.writeText(captainCode);
        showToast('A közös kapitányi kód a vágólapra került.');
      } else {
        await Share.share({ message: captainCode });
      }
    } catch (error) {
      showToast('A kód másolása sikertelen. Jelöld ki és másold ki kézzel.', 'error');
    }
  };

  useEffect(() => {
    if (!isLoading && (!profile || !canManageAdmin)) router.replace('/');
  }, [canManageAdmin, isLoading, profile, router]);

  useEffect(() => {
    if (!isLoading && canManageAdmin) {
      void refreshTeams().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showToast(t('alerts.generic', { message }), 'error');
      });
    }
  }, [canManageAdmin, isLoading, refreshTeams, showToast, t]);

  useEffect(() => {
    if (!programId || !canManageAdmin || isLoading) return;

    let isActive = true;
    void getProgram(programId)
      .then((program) => {
        if (!isActive) return;
        if (!program) {
          Alert.alert(t('programs.notFound'));
          return;
        }
        setIsEditingEvent(true);
        setAdminEventTitle(program.title ?? '');
        setAdminEventTime(program.time ?? '');
        setAdminEventLocation(program.helyszín ?? '');
        setAdminEventDay(EVENT_DAYS.includes(program.day ?? '') ? program.day ?? 'Szerda' : 'Szerda');
        setAdminEventDescription(program.description ?? '');
        setAdminEventImage(program.thumb ?? program.image);
        setEventImagePayload(undefined);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : String(error);
        Alert.alert(t('alerts.generic', { message }));
      });

    return () => {
      isActive = false;
    };
  }, [canManageAdmin, getProgram, isLoading, programId, t]);

  const handleNormalizeUserTeamNames = async () => {
    try {
      const count = await normalizeUserTeamNames();
      showToast(t('admin.userTeamNamesNormalized', { count }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
    }
  };

  const handleDeleteTeam = (team: Team) => {
    const confirm = () => {
      void deleteTeam(team.id)
        .then(() => showToast(t('admin.teamDeleted', { team: team.name || team.id })))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          showToast(t('alerts.generic', { message }), 'error');
        });
    };

    const title = t('admin.deleteTeam');
    const message = t('admin.confirmDeleteTeam', { team: team.name || team.id });
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) confirm();
      return;
    }
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('admin.deleteTeam'), style: 'destructive', onPress: confirm },
    ]);
  };

  const handlePickEventImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('alerts.permissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        base64: false,
      });
      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      if (!uri) return;

      const [{ dataUrl: image }, { dataUrl: thumb }] = await Promise.all([
        processImage(uri, { maxSide: 1200, quality: 0.7, maxBytes: 700000 }),
        makeThumbnail(uri),
      ]);
      setAdminEventImage(thumb);
      setEventImagePayload({ image, thumb });
    } catch (error) {
      if (error instanceof Error && error.message === 'image-too-large') {
        Alert.alert(t('alerts.imageTooLarge'));
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    }
  };

  const handleAddEvent = async () => {
    if (!adminEventTitle.trim() || !adminEventLocation.trim()) {
      Alert.alert(t('alerts.fillProgramFields'));
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(adminEventTime.trim())) {
      Alert.alert(t('alerts.invalidProgramTime'));
      return;
    }

    setIsUploading(true);
    try {
      await addEvent({
        id: programId,
        title: adminEventTitle,
        time: adminEventTime,
        location: adminEventLocation,
        day: adminEventDay,
        description: adminEventDescription,
        image: eventImagePayload,
      });
      setAdminEventTitle('');
      setAdminEventTime('');
      setAdminEventLocation('');
      setAdminEventDescription('');
      setAdminEventImage(undefined);
      setEventImagePayload(undefined);
      Alert.alert(t(isEditingEvent ? 'alerts.programUpdated' : 'alerts.programAdded', { day: adminEventDay }));
      router.replace('/schedule');
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

  const handleFetchPending = useCallback(async () => {
    await refreshPendingUsers();
    setShowPending(true);
  }, [refreshPendingUsers]);

  useEffect(() => {
    if (!isLoading && canManageAdmin && (section === 'verifications' || section === 'verification')) {
      void refreshPendingUsers()
        .then(() => setShowPending(true))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          Alert.alert(t('alerts.generic', { message }));
        });
    }
  }, [canManageAdmin, isLoading, refreshPendingUsers, section, t]);

  const handleApprove = async (userId: string) => {
    try {
      await approveUser(userId);
      Alert.alert(t('alerts.idApproved'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    }
  };

  if (isLoading || !canManageAdmin) return null;

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
      teams={teams}
      captainCode={captainCode}
      captainCodeActive={captainCodeActive}
      captainCodeExpiresAt={captainCodeExpiresAt}
      captainCodeLoading={captainCodeLoading}
      onGenerateCaptainCode={() => void handleGenerateCaptainCode()}
      onRevokeCaptainCode={() => void handleRevokeCaptainCode()}
      onCopyCaptainCode={() => void handleCopyCaptainCode()}
      onBack={() => goBackOrHome(router)}
      onEventDayChange={setAdminEventDay}
      onEventTitleChange={setAdminEventTitle}
      onEventTimeChange={setAdminEventTime}
      onEventLocationChange={setAdminEventLocation}
      adminEventDescription={adminEventDescription}
      adminEventImage={adminEventImage}
      isEditingEvent={isEditingEvent}
      onEventDescriptionChange={setAdminEventDescription}
      onPickEventImage={() => void handlePickEventImage()}
      onAddEvent={handleAddEvent}
      onNotifTitleChange={setNotifTitle}
      onNotifBodyChange={setNotifBody}
      onSendNotification={handleSendNotification}
      onFetchPendingUsers={() => void handleFetchPending()}
      onApproveUser={(userId) => void handleApprove(userId)}
      onOpenVerifications={() => router.replace({ pathname: '/admin', params: { section: 'verifications' } })}
      onOpenPrograms={() => router.push('/schedule')}
      onOpenUsers={() => router.push('/users')}
      onOpenInvites={() => router.push('/invites')}
      onNormalizeUserTeamNames={() => void handleNormalizeUserTeamNames()}
      onDeleteTeam={handleDeleteTeam}
    />
  );
}
