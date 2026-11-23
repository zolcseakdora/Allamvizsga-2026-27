import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { FilterChip } from '@/src/components/controls/filter-chip';
import {
  EVENT_DAY_LABEL_KEYS,
  WEEKDAYS,
  WEEKDAY_LABEL_KEYS,
} from '@/src/constants/event-days';
import type { EventSeason } from '@/src/constants/event-schedule';
import type { NotificationAudience } from '@/src/services/notifications';
import type { Team } from '@/src/types/team';

type PendingUser = {
  id: string;
  name?: string;
  email?: string;
  team?: string;
  isVerified: boolean;
  accountStatus?: string;
  igazolas: string;
  eventType: EventSeason;
  isLegacy: boolean;
};

type AdminDashboardScreenProps = {
  adminEventDay: string;
  adminEventTitle: string;
  adminEventTime: string;
  adminEventLocation: string;
  adminEventDescription: string;
  adminEventImage?: string;
  adminEventDate: string;
  eventType?: 'februtalis' | 'diaknapok';
  isFebrutalisOrganizer?: boolean;
  canDeleteEvent?: boolean;
  eventDays?: Array<{ id: string; date: string; weekday: string; order: number }>;
  selectedDayId?: string | null;
  isEditingEvent: boolean;
  isUploading: boolean;
  notifTitle: string;
  notifBody: string;
  notificationEventType: EventSeason;
  notificationAudience: NotificationAudience;
  verificationEventType: EventSeason;
  isConfirmingNotification: boolean;
  showPending: boolean;
  pendingUsers: PendingUser[];
  teams: Team[];
  captainCode: string;
  captainCodeActive: boolean;
  captainCodeExpiresAt: string | null;
  captainCodeLoading: boolean;
  onGenerateCaptainCode: () => void;
  onRevokeCaptainCode: () => void;
  onCopyCaptainCode: () => void;
  onBack: () => void;
  onEventDayChange: (day: string) => void;
  onEventDateChange: (date: string) => void;
  onEventTitleChange: (value: string) => void;
  onEventTimeChange: (value: string) => void;
  onEventLocationChange: (value: string) => void;
  onEventDescriptionChange: (value: string) => void;
  onEventDaySelect?: (dayId: string | null) => void;
  onNewDayNameChange?: (value: string) => void;
  onAddDay?: () => void;
  onDeleteDay?: (dayId: string) => void;
  onPickEventImage: () => void;
  onAddEvent: () => void;
  onNotifTitleChange: (value: string) => void;
  onNotifBodyChange: (value: string) => void;
  onNotificationEventTypeChange: (eventType: EventSeason) => void;
  onNotificationAudienceChange: (audience: NotificationAudience) => void;
  onVerificationEventTypeChange: (eventType: EventSeason) => void;
  onSendNotification: () => void;
  onConfirmNotification: () => void;
  onCancelNotification: () => void;
  onFetchPendingUsers: () => void;
  onApproveUser: (user: PendingUser) => void;
  onOpenVerifications: () => void;
  onOpenPrograms: () => void;
  onOpenUsers: () => void;
  onOpenInvites: () => void;
  onNormalizeUserTeamNames: () => void;
  onDeleteTeam: (team: Team) => void;
}

export function AdminDashboardScreen({
  adminEventDay,
  adminEventTitle,
  adminEventTime,
  adminEventLocation,
  adminEventDescription,
  adminEventImage,
  adminEventDate,
  eventType,
  isFebrutalisOrganizer = false,
  canDeleteEvent = true,
  eventDays,
  selectedDayId,
  isEditingEvent,
  isUploading,
  notifTitle,
  notifBody,
  notificationEventType,
  notificationAudience,
  verificationEventType,
  isConfirmingNotification,
  showPending,
  pendingUsers,
  teams,
  captainCode,
  captainCodeActive,
  captainCodeExpiresAt,
  captainCodeLoading,
  onGenerateCaptainCode,
  onRevokeCaptainCode,
  onCopyCaptainCode,
  onBack,
  onEventDayChange,
  onEventDateChange,
  onEventTitleChange,
  onEventTimeChange,
  onEventLocationChange,
  onEventDescriptionChange,
  onEventDaySelect,
  onNewDayNameChange,
  onAddDay,
  onDeleteDay,
  onPickEventImage,
  onAddEvent,
  onNotifTitleChange,
  onNotifBodyChange,
  onNotificationEventTypeChange,
  onNotificationAudienceChange,
  onVerificationEventTypeChange,
  onSendNotification,
  onConfirmNotification,
  onCancelNotification,
  onFetchPendingUsers,
  onApproveUser,
  onOpenVerifications,
  onOpenPrograms,
  onOpenUsers,
  onOpenInvites,
  onNormalizeUserTeamNames,
  onDeleteTeam,
}: AdminDashboardScreenProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isFebrutalis = eventType === 'februtalis';

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.headerRow}>
          {width < 900 && <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>}
        </View>
        <Text style={styles.title}>⚙️ {t('admin.title')}</Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {!isFebrutalis && !isFebrutalisOrganizer && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎓 Közös kapitányi regisztrációs kód</Text>
            <Text style={styles.cardText}>
              Egy kódot minden kapitány használhat a gyűlésen. A kód 30 napig érvényes, és csak a jelentkezést indítja el: a csapatot kizárólag a főszervező jóváhagyása után hozza létre a rendszer.
            </Text>
            <Text style={styles.cardText}>
              {captainCodeActive
                ? `Aktív közös kód (lejárat: ${captainCodeExpiresAt ? new Date(captainCodeExpiresAt).toLocaleString('hu-HU') : 'ismeretlen'})`
                : 'Nincs aktív közös kód.'}
            </Text>
            {captainCode ? (
              <>
                <Text style={styles.profileLabel}>A kód csak most látható. Másold ki, és a gyűlésen vetítsd ki vagy oszd meg személyesen.</Text>
                <Text selectable style={styles.codeValue}>{captainCode}</Text>
                <TouchableOpacity style={styles.outlineButton} onPress={onCopyCaptainCode}>
                  <Text style={styles.outlineButtonText}>📋 Kód másolása</Text>
                </TouchableOpacity>
              </>
            ) : captainCodeActive ? (
              <Text style={styles.cardText}>A kód korábban már létrejött, biztonsági okból nem kérhető le újra. Ha elveszett, vond vissza, majd generálj újat.</Text>
            ) : null}
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={captainCodeActive ? onRevokeCaptainCode : onGenerateCaptainCode}
              disabled={captainCodeLoading}
            >
              <Text style={styles.outlineButtonText}>
                {captainCodeLoading
                  ? 'Feldolgozás...'
                  : captainCodeActive
                    ? '🛑 Közös kód visszavonása'
                    : '🔑 Új közös kapitányi kód generálása'}
              </Text>
            </TouchableOpacity>
          </View>
          )}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🧰 {t('admin.management')}</Text>
            <TouchableOpacity style={styles.outlineButton} onPress={onOpenPrograms}>
              <Text style={styles.outlineButtonText}>📅 {t('admin.managePrograms')}</Text>
            </TouchableOpacity>
            {!isFebrutalisOrganizer && (
              <>
                <TouchableOpacity style={styles.outlineButton} onPress={onOpenVerifications}>
                  <Text style={styles.outlineButtonText}>🎓 {t('more.verification')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.outlineButton} onPress={onOpenUsers}>
                  <Text style={styles.outlineButtonText}>👥 {t('admin.registeredUsers')}</Text>
                </TouchableOpacity>
              </>
            )}
            {!isFebrutalis && (
              <>
                <TouchableOpacity style={styles.outlineButton} onPress={onNormalizeUserTeamNames}>
                  <Text style={styles.outlineButtonText}>🧹 {t('admin.normalizeUserTeamNames')}</Text>
                </TouchableOpacity>
              </>
            )}
            <Text style={styles.sectionSubtitle}>{t('admin.manageTeams')}</Text>
            {teams.length === 0 ? (
              <Text style={styles.emptyState}>
                {t(isFebrutalis ? 'admin.noRegisteredFebrutalisTeams' : 'admin.noTeams')}
              </Text>
            ) : (
              <View style={styles.teamList}>
                {teams.map((team) => (
                  <View key={team.id} style={styles.teamRow}>
                    <Text style={styles.teamName}>{team.name || team.id}</Text>
                    {!isFebrutalis && (
                      <TouchableOpacity style={styles.deleteButton} onPress={() => onDeleteTeam(team)}>
                        <Text style={styles.deleteButtonText}>{t('admin.deleteTeam')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
            {!isFebrutalisOrganizer && (
              <TouchableOpacity style={[styles.outlineButton, styles.lastOutlineButton]} onPress={onOpenInvites}>
                <Text style={styles.outlineButtonText}>✉️ {t(isFebrutalis ? 'inviteManagement.februtalisTitle' : 'admin.invites')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 {t(isEditingEvent ? 'admin.editProgram' : 'admin.addProgram')}</Text>
            <Text style={styles.profileLabel}>{t('admin.chooseDay')}</Text>
            {isFebrutalis && eventDays && eventDays.length > 0 ? (
              <>
                <View style={styles.dayList}>
                  {eventDays.map(day => (
                    <View key={day.id} style={styles.dynamicDayRow}>
                      <FilterChip label={t(EVENT_DAY_LABEL_KEYS[day.weekday as keyof typeof EVENT_DAY_LABEL_KEYS] ?? day.weekday)} selected={selectedDayId === day.id} onPress={() => onEventDaySelect?.(day.id)} style={styles.dayChip} />
                      {canDeleteEvent && (
                        <TouchableOpacity style={styles.deleteDayButton} onPress={() => onDeleteDay?.(day.id)}>
                          <Text style={styles.deleteDayText}>{t('admin.deleteDay')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
                <Text style={styles.profileLabel}>{t('admin.chooseWeekday')}</Text>
                <View style={styles.dayList}>
                  {WEEKDAYS.map((weekday) => (
                    <FilterChip
                      key={weekday}
                      label={t(WEEKDAY_LABEL_KEYS[weekday as keyof typeof WEEKDAY_LABEL_KEYS])}
                      selected={adminEventDay === weekday}
                      onPress={() => onNewDayNameChange?.(weekday)}
                      style={styles.dayChip}
                    />
                  ))}
                </View>
                <TextInput style={styles.input} placeholder={t('admin.programDatePlaceholder')} placeholderTextColor="#888" value={adminEventDate} onChangeText={onEventDateChange} keyboardType="numbers-and-punctuation" />
                <TouchableOpacity style={styles.outlineButton} onPress={onAddDay}>
                  <Text style={styles.outlineButtonText}>＋ {t('admin.addDay')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.dayList}>
                  {WEEKDAYS.map((weekday) => (
                    <FilterChip
                      key={weekday}
                      label={t(WEEKDAY_LABEL_KEYS[weekday as keyof typeof WEEKDAY_LABEL_KEYS])}
                      selected={adminEventDay === weekday}
                      onPress={() => onEventDayChange(weekday)}
                      style={styles.dayChip}
                    />
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t('admin.programDatePlaceholder')}
                  placeholderTextColor="#888"
                  value={adminEventDate}
                  onChangeText={onEventDateChange}
                  keyboardType="numbers-and-punctuation"
                />
              </>
            )}
            <TextInput style={styles.input} placeholder={t('admin.programTitlePlaceholder')} placeholderTextColor="#888" value={adminEventTitle} onChangeText={onEventTitleChange} />
            <TextInput style={styles.input} placeholder={t('admin.timePlaceholder')} placeholderTextColor="#888" value={adminEventTime} onChangeText={onEventTimeChange} keyboardType="numbers-and-punctuation" />
            <TextInput style={styles.input} placeholder={t('admin.locationPlaceholder')} placeholderTextColor="#888" value={adminEventLocation} onChangeText={onEventLocationChange} />
            <TextInput
              style={styles.notificationBody}
              placeholder={t('admin.programDescriptionPlaceholder')}
              placeholderTextColor="#888"
              multiline
              value={adminEventDescription}
              onChangeText={onEventDescriptionChange}
            />
            <TouchableOpacity style={styles.outlineButton} onPress={onPickEventImage} disabled={isUploading}>
              <Text style={styles.outlineButtonText}>{t('admin.chooseProgramImage')}</Text>
            </TouchableOpacity>
            {adminEventImage && <Image source={{ uri: adminEventImage }} style={styles.programImagePreview} resizeMode="cover" />}
            <TouchableOpacity style={[styles.solidButton, { opacity: isUploading ? 0.7 : 1 }]} onPress={onAddEvent} disabled={isUploading}>
              <Text style={styles.solidButtonText}>{isUploading ? t('admin.uploading') : t(isEditingEvent ? 'admin.updateProgram' : 'admin.saveProgram')}</Text>
            </TouchableOpacity>
          </View>

          {!isFebrutalisOrganizer && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📯 {t('admin.sendNotification')}</Text>
              <Text style={styles.profileLabel}>{t('admin.notificationEvent')}</Text>
              <View style={styles.dayList}>
                {(['diaknapok', 'februtalis'] as const).map((eventOption) => (
                  <FilterChip
                    key={eventOption}
                    label={t(`eventNames.${eventOption}`)}
                    selected={notificationEventType === eventOption}
                    onPress={() => onNotificationEventTypeChange(eventOption)}
                    style={styles.dayChip}
                  />
                ))}
              </View>
              <Text style={styles.profileLabel}>{t('admin.notificationAudience')}</Text>
              <View style={styles.dayList}>
                {(['everyone', 'captains', 'organizers'] as const).map((audience) => (
                  <FilterChip
                    key={audience}
                    label={t(`notificationAudiences.${audience}`)}
                    selected={notificationAudience === audience}
                    onPress={() => onNotificationAudienceChange(audience)}
                    style={styles.dayChip}
                  />
                ))}
              </View>
              <TextInput style={styles.input} placeholder={t('admin.notificationTitlePlaceholder')} placeholderTextColor="#888" value={notifTitle} onChangeText={onNotifTitleChange} />
              <TextInput style={styles.notificationBody} placeholder={t('admin.notificationBodyPlaceholder')} placeholderTextColor="#888" multiline value={notifBody} onChangeText={onNotifBodyChange} />
              {isConfirmingNotification ? (
                <>
                  <Text style={styles.emptyState}>
                    {t('admin.notificationSummary', {
                      event: t(`eventNames.${notificationEventType}`),
                      audience: t(`notificationAudiences.${notificationAudience}`),
                    })}
                  </Text>
                  <View style={styles.dayList}>
                    <TouchableOpacity style={styles.solidButton} onPress={onConfirmNotification}>
                      <Text style={styles.solidButtonText}>{t('notifications.send')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.outlineButton} onPress={onCancelNotification}>
                      <Text style={styles.outlineButtonText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <TouchableOpacity style={styles.solidButton} onPress={onSendNotification}>
                  <Text style={styles.solidButtonText}>{t('admin.send')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!isFebrutalisOrganizer && <View style={styles.card}>
            <Text style={styles.cardTitle}>🎓 {t('admin.verifyIds')}</Text>
            <View style={styles.dayList}>
              {(['diaknapok', 'februtalis'] as const).map((verificationEvent) => (
                <FilterChip
                  key={verificationEvent}
                  label={t(`eventNames.${verificationEvent}`)}
                  selected={verificationEventType === verificationEvent}
                  onPress={() => onVerificationEventTypeChange(verificationEvent)}
                  style={styles.dayChip}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.outlineButton} onPress={onFetchPendingUsers}>
              <Text style={styles.outlineButtonText}>🔄 {t('admin.listIds')}</Text>
            </TouchableOpacity>

            {showPending && (
              <View style={styles.pendingList}>
                {pendingUsers.length === 0 ? (
                  <Text style={styles.emptyState}>{t('admin.emptyIds')}</Text>
                ) : (
                  pendingUsers.map(user => (
                    <View key={user.id} style={styles.pendingUserCard}>
                      <Text style={styles.pendingUserName}>{user.name} ({user.email})</Text>
                      <View style={styles.eventTypeChip}>
                        <Text style={styles.eventTypeChipText}>{t(`eventNames.${user.eventType}`)}</Text>
                      </View>
                      <Text style={styles.teamName}>{t('admin.team', { team: user.team || t('profile.individualTeam') })}</Text>
                      <Text style={[styles.verificationStatus, { color: user.isVerified ? '#27AE60' : '#F39C12' }]}>
                        {t('admin.status', { status: user.isVerified ? t('verification.accepted') : t('verification.pending') })}
                      </Text>
                      {user.igazolas ? (
                        <Image source={{ uri: user.igazolas }} style={styles.idImage} resizeMode="contain" />
                      ) : null}
                      {user.accountStatus ? (
                        <>
                          <Text style={styles.cardText}>
                            Az igazolás itt megtekinthető. A regisztráció jóváhagyása vagy elutasítása a Regisztráltak oldalon történik.
                          </Text>
                          <TouchableOpacity style={styles.outlineButton} onPress={onOpenUsers}>
                            <Text style={styles.outlineButtonText}>👥 Regisztráltak megnyitása</Text>
                          </TouchableOpacity>
                        </>
                      ) : !user.isVerified ? (
                        <TouchableOpacity style={styles.approveButton} onPress={() => onApproveUser(user)}>
                          <Text style={styles.solidButtonText}>✅ {t('admin.approve')}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            )}
          </View>}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 1000, flex: 1, padding: 24, alignSelf: 'flex-start' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  backText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#EC2127', marginBottom: 6, textAlign: 'center', letterSpacing: 1, marginTop: 15 },
  scroll: { width: '100%' },
  card: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  cardText: { color: '#aaa', fontSize: 13, marginBottom: 12 },
  codeValue: { color: '#FFF', fontSize: 17, fontWeight: 'bold', padding: 12, backgroundColor: '#121212', borderRadius: 8, marginBottom: 12 },
  sectionSubtitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginTop: 4, marginBottom: 6 },
  profileLabel: { fontSize: 12, color: '#aaa', marginTop: 8 },
  dayList: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, marginTop: 5 },
  dynamicDayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dayChip: { marginBottom: 6 },
  deleteDayButton: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#2A1C1D', borderWidth: 1, borderColor: '#EC2127' },
  deleteDayText: { color: '#EC2127', fontSize: 11, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#1E1E1E', color: '#FFF' },
  notificationBody: { height: 70, textAlignVertical: 'top', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#1E1E1E', color: '#FFF' },
  solidButton: { backgroundColor: '#EC2127', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  solidButtonText: { color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
  outlineButton: { borderWidth: 2, borderColor: '#EC2127', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center', marginBottom: 14, backgroundColor: '#1E1E1E' },
  lastOutlineButton: { marginBottom: 0 },
  outlineButtonText: { color: '#FFF', fontWeight: 'bold' },
  pendingList: { marginTop: 10 },
  emptyState: { color: '#888', textAlign: 'center', marginTop: 10 },
  pendingUserCard: { backgroundColor: '#121212', padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#333' },
  pendingUserName: { color: '#FFF', fontWeight: 'bold' },
  eventTypeChip: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#EC2127', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, marginBottom: 4 },
  eventTypeChipText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  teamName: { color: '#aaa', fontSize: 12, marginBottom: 5 },
  verificationStatus: { fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  idImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 10 },
  approveButton: { backgroundColor: '#27AE60', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  teamList: { marginBottom: 12 },
  teamRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333', paddingVertical: 6 },
  deleteButton: { paddingVertical: 8, paddingHorizontal: 10 },
  deleteButtonText: { color: '#EC2127', fontWeight: 'bold' },
  programImagePreview: { width: 120, height: 80, borderRadius: 8, alignSelf: 'center', marginBottom: 12 },
});