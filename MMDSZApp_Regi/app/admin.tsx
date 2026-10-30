import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AdminDashboardScreen } from '@/src/screens/admin-dashboard-screen';
import { useAdmin } from '@/src/hooks/use-admin';
import { useAuth } from '@/src/context/AuthContext';
import { useEventSeason } from '@/src/context/EventSeasonContext';
import { useToast } from '@/src/context/ToastContext';
import { useSponsors } from '@/src/hooks/use-sponsors';
import { canRole } from '@/src/constants/roles';
import { makeThumbnail, processImage } from '@/src/services/images';
import { EVENT_DAYS } from '@/src/constants/event-days';
import { useEventPrograms } from '@/src/hooks/use-event-programs';
import { usePrograms } from '@/src/hooks/use-programs';
import { useSchedulePrograms } from '@/src/hooks/use-schedule-programs';
import type { Sponsor } from '@/src/types/sponsor';
import type { Team } from '@/src/types/team';
import { goBackOrHome } from '@/src/utils/navigation';

export default function AdminRoute() {
  const router = useRouter();
  const { section, programId, dayId } = useLocalSearchParams<{ section?: string; programId?: string; dayId?: string }>();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { profile, isLoading } = useAuth();
  const { eventType, edition } = useEventSeason();
  const { sponsors, refreshSponsors, addSponsor, deleteSponsor } = useSponsors();
  const { days: eventDays, saveDay, deleteDay, saveProgram } = useEventPrograms(edition);
  const { getProgram: getLegacyProgram } = usePrograms();
  const { getProgram: getScheduleProgram } = useSchedulePrograms();
  const canManageAdmin = canRole(profile?.role, 'manageAdmin');
  const {
    pendingUsers,
    refreshPendingUsers,
    approveUser,
    addEvent,
    sendNotification,
    createMissingTeams,
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
  const [adminDayId, setAdminDayId] = useState<string | null>(null);
  const [newDayName, setNewDayName] = useState('');
  const [newDayDate, setNewDayDate] = useState('');
  const [eventImagePayload, setEventImagePayload] = useState<{ image: string; thumb: string }>();
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorLink, setSponsorLink] = useState('');
  const [sponsorLogo, setSponsorLogo] = useState<string>();
  const [isManagingSponsors, setIsManagingSponsors] = useState(false);

  useEffect(() => {
    if (!isLoading && (!profile || !canManageAdmin)) router.replace('/');
  }, [canManageAdmin, isLoading, profile, router]);

  useEffect(() => {
    if (!isLoading && canManageAdmin) {
      void Promise.all([refreshSponsors(), refreshTeams()]).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showToast(t('alerts.generic', { message }), 'error');
      });
    }
  }, [canManageAdmin, isLoading, refreshSponsors, refreshTeams, showToast, t]);

  useEffect(() => {
    if (eventType !== 'februtalis' || !eventDays.length) {
      setAdminDayId(null);
      return;
    }
    if (!adminDayId || !eventDays.some((day) => day.id === adminDayId)) {
      setAdminDayId(eventDays[0].id);
    }
  }, [adminDayId, eventDays, eventType]);

  useEffect(() => {
    if (!programId || !canManageAdmin || isLoading) return;

    let isActive = true;
    const resolveProgram = async () => {
      let program: { title?: string; time?: string; helyszín?: string; day?: string; description?: string; image?: string; thumb?: string; id?: string } | null;
      if (eventType === 'februtalis' && dayId) {
        program = await getScheduleProgram(programId, dayId);
      } else {
        program = await getLegacyProgram(programId);
      }

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
      if (program.day && eventDays.some((day) => day.weekday === program.day)) {
        setAdminDayId(eventDays.find((day) => day.weekday === program.day)?.id ?? null);
      } else if (dayId) {
        setAdminDayId(dayId);
      }
      setAdminEventDescription(program.description ?? '');
      setAdminEventImage(program.thumb ?? program.image);
      setEventImagePayload(undefined);
    };

    void resolveProgram().catch((error: unknown) => {
      if (!isActive) return;
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    });

    return () => {
      isActive = false;
    };
  }, [canManageAdmin, dayId, eventDays, eventType, getLegacyProgram, getScheduleProgram, isLoading, programId, t]);

  const handleAddDay = async () => {
    if (eventType !== 'februtalis' || !edition) {
      return;
    }

    const weekday = newDayName.trim();
    const date = newDayDate.trim();
    if (!weekday || !date) {
      Alert.alert(t('alerts.requiredFields'));
      return;
    }

    try {
      const dayId = await saveDay({ date, weekday, order: eventDays.length });
      setAdminDayId(dayId);
      setNewDayName('');
      setNewDayDate('');
      showToast(t('admin.dayAdded'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    if (eventType !== 'februtalis') {
      return;
    }

    try {
      await deleteDay(dayId);
      if (adminDayId === dayId) {
        const nextDay = eventDays.find((day) => day.id !== dayId);
        setAdminDayId(nextDay?.id ?? null);
      }
      showToast(t('admin.dayDeleted'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
    }
  };

  const handleCreateMissingTeams = async () => {
    try {
      const count = await createMissingTeams();
      await refreshTeams();
      showToast(count > 0
        ? t('admin.missingTeamsCreated', { count })
        : t('admin.noMissingTeams'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
    }
  };

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

  const handlePickSponsorLogo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast(t('alerts.permissionRequired'), 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        base64: false,
      });
      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      if (!uri) return;

      const { dataUrl } = await processImage(uri, { maxSide: 256, quality: 0.7, maxBytes: 200000 });
      setSponsorLogo(dataUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
    }
  };

  const handleAddSponsor = async () => {
    const name = sponsorName.trim();
    if (!name || !sponsorLogo) {
      showToast(t('admin.sponsorFieldsRequired'), 'error');
      return;
    }

    setIsManagingSponsors(true);
    try {
      await addSponsor({ name, logo: sponsorLogo, link: sponsorLink.trim() || undefined });
      setSponsorName('');
      setSponsorLink('');
      setSponsorLogo(undefined);
      showToast(t('admin.sponsorAdded'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
    } finally {
      setIsManagingSponsors(false);
    }
  };

  const handleDeleteSponsor = (sponsor: Sponsor) => {
    Alert.alert(t('admin.deleteSponsor'), t('admin.confirmDeleteSponsor', { name: sponsor.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.deleteSponsor'),
        style: 'destructive',
        onPress: () => {
          setIsManagingSponsors(true);
          void deleteSponsor(sponsor.id)
            .then(() => showToast(t('admin.sponsorDeleted')))
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : String(error);
              showToast(t('alerts.generic', { message }), 'error');
            })
            .finally(() => setIsManagingSponsors(false));
        },
      },
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
      if (edition) {
        const selectedDayId = eventType === 'februtalis'
          ? adminDayId ?? eventDays[0]?.id ?? null
          : eventDays.find((day) => day.weekday === adminEventDay)?.id ?? eventDays[0]?.id ?? null;

        if (!selectedDayId) {
          throw new Error(t('alerts.requiredFields'));
        }

        await saveProgram({
          id: programId,
          dayId: selectedDayId,
          title: adminEventTitle,
          startsAt: adminEventTime,
          endsAt: undefined,
          location: adminEventLocation,
          description: adminEventDescription,
          type: 'other',
          status: 'scheduled',
          isHeadline: false,
          image: eventImagePayload,
        });
      } else {
        await addEvent({
          id: programId,
          title: adminEventTitle,
          time: adminEventTime,
          location: adminEventLocation,
          day: adminEventDay,
          description: adminEventDescription,
          image: eventImagePayload,
        });
      }

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
      sponsors={sponsors}
      teams={teams}
      sponsorName={sponsorName}
      sponsorLink={sponsorLink}
      sponsorLogo={sponsorLogo}
      isManagingSponsors={isManagingSponsors}
      onBack={() => goBackOrHome(router)}
      onEventDayChange={setAdminEventDay}
      onEventTitleChange={setAdminEventTitle}
      onEventTimeChange={setAdminEventTime}
      onEventLocationChange={setAdminEventLocation}
      adminEventDescription={adminEventDescription}
      adminEventImage={adminEventImage}
      eventType={eventType}
      eventDays={eventDays}
      selectedDayId={adminDayId}
      newDayName={newDayName}
      newDayDate={newDayDate}
      isEditingEvent={isEditingEvent}
      onEventDescriptionChange={setAdminEventDescription}
      onEventDaySelect={setAdminDayId}
      onNewDayNameChange={setNewDayName}
      onNewDayDateChange={setNewDayDate}
      onAddDay={() => void handleAddDay()}
      onDeleteDay={(dayId) => void handleDeleteDay(dayId)}
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
      onCreateMissingTeams={() => void handleCreateMissingTeams()}
      onNormalizeUserTeamNames={() => void handleNormalizeUserTeamNames()}
      onDeleteTeam={handleDeleteTeam}
      onSponsorNameChange={setSponsorName}
      onSponsorLinkChange={setSponsorLink}
      onPickSponsorLogo={() => void handlePickSponsorLogo()}
      onAddSponsor={() => void handleAddSponsor()}
      onDeleteSponsor={handleDeleteSponsor}
    />
  );
}
