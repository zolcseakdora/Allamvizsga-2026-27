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
import { canRole } from '@/src/constants/roles';
import { makeThumbnail, processImage } from '@/src/services/images';
import { WEEKDAYS } from '@/src/constants/event-days';
import { useEventPrograms } from '@/src/hooks/use-event-programs';
import { usePrograms } from '@/src/hooks/use-programs';
import { useSchedulePrograms } from '@/src/hooks/use-schedule-programs';
import type { Team } from '@/src/types/team';
import { UserRole } from '@/src/types/auth';
import { goBackOrHome } from '@/src/utils/navigation';
import type { EventSeason } from '@/src/constants/event-schedule';
import type { NotificationAudience } from '@/src/services/notifications';

function getWeekdayFromDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.toISOString().slice(0, 10) !== value) return null;

  return WEEKDAYS[(date.getUTCDay() + 6) % 7] ?? null;
}

export default function AdminRoute() {
  const router = useRouter();
  const { section, programId, dayId } = useLocalSearchParams<{ section?: string; programId?: string; dayId?: string }>();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { profile, isLoading } = useAuth();
  const { eventType, edition } = useEventSeason();
  const { days: eventDays, saveDay, deleteDay, saveProgram } = useEventPrograms(edition);
  const { getProgram: getLegacyProgram } = usePrograms();
  const { getProgram: getScheduleProgram } = useSchedulePrograms();
  const isFebrutalisOrganizer = eventType === 'februtalis'
    && profile?.eventMemberships?.februtalis?.role === UserRole.SZERVEZO
    && profile.role !== UserRole.FOSZERVEZO;
  const canManageAdmin = canRole(profile?.role, 'manageAdmin') || isFebrutalisOrganizer;
  const isHeadOrganizer = profile?.role === UserRole.FOSZERVEZO;
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
  const [adminEventDate, setAdminEventDate] = useState('');
  const [adminDayId, setAdminDayId] = useState<string | null>(null);
  const [newDayName, setNewDayName] = useState('');
  const [newDayDate, setNewDayDate] = useState('');
  const [eventImagePayload, setEventImagePayload] = useState<{ image: string; thumb: string }>();
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notificationEventSelection, setNotificationEventSelection] = useState({
    eventType,
    selectedEventType: eventType,
  });
  const [verificationEventType, setVerificationEventType] = useState<EventSeason>(eventType);
  const [notificationAudience, setNotificationAudience] = useState<NotificationAudience>('everyone');
  const [isConfirmingNotification, setIsConfirmingNotification] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPending, setShowPending] = useState(false);

  if (notificationEventSelection.eventType !== eventType) {
    setNotificationEventSelection({ eventType, selectedEventType: eventType });
  }
  const notificationEventType = notificationEventSelection.selectedEventType;

  useEffect(() => {
    if (!isLoading && (!profile || !canManageAdmin)) router.replace('/');
  }, [canManageAdmin, isLoading, profile, router]);

  useEffect(() => {
    if (!isLoading && canManageAdmin) {
      void refreshTeams(eventType).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showToast(t('alerts.generic', { message }), 'error');
      });
    }
  }, [canManageAdmin, eventType, isLoading, refreshTeams, showToast, t]);

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
      let program: { title?: string; time?: string; helyszín?: string; day?: string; dayId?: string; description?: string; image?: string; thumb?: string; id?: string } | null;
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
      const programDay = eventDays.find((day) => day.id === program.dayId);
      const weekday = WEEKDAYS.includes(program.day ?? '') ? program.day ?? 'Szerda' : 'Szerda';
      setAdminEventDay(weekday);
      setNewDayName(weekday);
      setAdminEventDate(programDay?.date ?? '');
      setNewDayDate(programDay?.date ?? '');
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
    if (getWeekdayFromDate(date) !== weekday) {
      Alert.alert(t('alerts.invalidProgramDate'));
      return;
    }

    try {
      const existingDay = eventDays.find((day) => day.date === date);
      if (existingDay && existingDay.weekday !== weekday) {
        Alert.alert(t('alerts.invalidProgramDate'));
        return;
      }
      const dayId = await saveDay({
        ...(existingDay ? { id: existingDay.id } : {}),
        date,
        weekday,
        order: eventDays.length,
        isProgramDayOnly: date < edition.startDate || date > edition.endDate,
      });
      setAdminDayId(dayId);
      setNewDayName('');
      setNewDayDate('');
      setAdminEventDate('');
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
      void deleteTeam(team.id, eventType)
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
      if (edition) {
        const date = adminEventDate.trim();
        if (date && getWeekdayFromDate(date) !== adminEventDay) {
          Alert.alert(t('alerts.invalidProgramDate'));
          return;
        }

        let selectedDay = date
          ? eventDays.find((day) => day.date === date)
          : eventDays.find((day) => day.id === adminDayId && day.weekday === adminEventDay)
            ?? eventDays.find((day) => day.weekday === adminEventDay);
        if (selectedDay && selectedDay.weekday !== adminEventDay) {
          Alert.alert(t('alerts.invalidProgramDate'));
          return;
        }
        if (!selectedDay) {
          if (!date) {
            Alert.alert(t('alerts.requiredFields'));
            return;
          }
          const dayId = await saveDay({
            date,
            weekday: adminEventDay,
            order: eventDays.length,
            isProgramDayOnly: date < edition.startDate || date > edition.endDate,
          });
          selectedDay = { id: dayId, date, weekday: adminEventDay, order: eventDays.length };
        }

        await saveProgram({
          id: programId,
          dayId: selectedDay.id,
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
      setAdminEventDate('');
      setNewDayDate('');
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
    setIsConfirmingNotification(true);
  };

  const handleConfirmNotification = async () => {
    try {
      await sendNotification(notifTitle, notifBody, notificationEventType, notificationAudience);
      setNotifTitle('');
      setNotifBody('');
      setIsConfirmingNotification(false);
      Alert.alert(t('alerts.notificationSent'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    }
  };

  const handleFetchPending = useCallback(async () => {
    await refreshPendingUsers(verificationEventType);
    setShowPending(true);
  }, [refreshPendingUsers, verificationEventType]);

  useEffect(() => {
    if (!isLoading && canManageAdmin && isHeadOrganizer && (section === 'verifications' || section === 'verification')) {
      void refreshPendingUsers(verificationEventType)
        .then(() => setShowPending(true))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          Alert.alert(t('alerts.generic', { message }));
        });
    }
  }, [canManageAdmin, isHeadOrganizer, isLoading, refreshPendingUsers, section, t, verificationEventType]);

  const handleApprove = async (userId: string, selectedEventType: EventSeason, isLegacy: boolean) => {
    try {
      await approveUser(userId, selectedEventType, isLegacy);
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
      notificationEventType={notificationEventType}
      notificationAudience={notificationAudience}
      verificationEventType={verificationEventType}
      isConfirmingNotification={isConfirmingNotification}
      showPending={showPending}
      pendingUsers={pendingUsers}
      teams={teams}
      onBack={() => goBackOrHome(router)}
      onEventDayChange={(weekday) => {
        setAdminEventDay(weekday);
        setNewDayName(weekday);
        const existingDay = eventDays.find((day) => day.weekday === weekday);
        setAdminDayId(existingDay?.id ?? null);
        setNewDayDate(existingDay?.date ?? '');
        setAdminEventDate(existingDay?.date ?? '');
      }}
      onEventDateChange={(date) => {
        setAdminEventDate(date);
        setNewDayDate(date);
      }}
      onEventTitleChange={setAdminEventTitle}
      onEventTimeChange={setAdminEventTime}
      onEventLocationChange={setAdminEventLocation}
      adminEventDescription={adminEventDescription}
      adminEventImage={adminEventImage}
      adminEventDate={adminEventDate}
      eventType={eventType}
      isFebrutalisOrganizer={isFebrutalisOrganizer}
      canDeleteEvent={isHeadOrganizer}
      eventDays={eventDays}
      selectedDayId={adminDayId}
      isEditingEvent={isEditingEvent}
      onEventDescriptionChange={setAdminEventDescription}
      onEventDaySelect={(dayId) => {
        setAdminDayId(dayId);
        const selectedDay = eventDays.find((day) => day.id === dayId);
        if (selectedDay) {
          setAdminEventDay(selectedDay.weekday);
          setNewDayName(selectedDay.weekday);
          setNewDayDate(selectedDay.date);
          setAdminEventDate(selectedDay.date);
        }
      }}
      onNewDayNameChange={(weekday) => {
        setNewDayName(weekday);
        setAdminEventDay(weekday);
        const existingDay = eventDays.find((day) => day.weekday === weekday);
        setAdminDayId(existingDay?.id ?? null);
        setNewDayDate(existingDay?.date ?? '');
        setAdminEventDate(existingDay?.date ?? '');
      }}
      onAddDay={() => void handleAddDay()}
      onDeleteDay={(dayId) => void handleDeleteDay(dayId)}
      onPickEventImage={() => void handlePickEventImage()}
      onAddEvent={handleAddEvent}
      onNotifTitleChange={setNotifTitle}
      onNotifBodyChange={setNotifBody}
      onNotificationEventTypeChange={(selectedEventType) => (
        setNotificationEventSelection({ eventType, selectedEventType })
      )}
      onNotificationAudienceChange={setNotificationAudience}
      onVerificationEventTypeChange={setVerificationEventType}
      onSendNotification={handleSendNotification}
      onConfirmNotification={() => void handleConfirmNotification()}
      onCancelNotification={() => setIsConfirmingNotification(false)}
      onFetchPendingUsers={() => void handleFetchPending()}
      onApproveUser={(user) => void handleApprove(user.id, user.eventType, user.isLegacy)}
      onOpenVerifications={() => router.replace({ pathname: '/admin', params: { section: 'verifications' } })}
      onOpenPrograms={() => router.push('/schedule')}
      onOpenUsers={() => router.push('/users')}
      onOpenInvites={() => router.push('/invites')}
      onCreateMissingTeams={() => void handleCreateMissingTeams()}
      onNormalizeUserTeamNames={() => void handleNormalizeUserTeamNames()}
      onDeleteTeam={handleDeleteTeam}
    />
  );
}
