import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { FilterChip } from '@/src/components/controls/filter-chip';
import { EVENT_DAYS, EVENT_DAY_LABEL_KEYS } from '@/src/constants/event-days';
import type { Sponsor } from '@/src/types/sponsor';
import type { Team } from '@/src/types/team';

type PendingUser = {
  id: string;
  name?: string;
  email?: string;
  team?: string;
  isVerified?: boolean;
  igazolas: string;
};

type AdminDashboardScreenProps = {
  adminEventDay: string;
  adminEventTitle: string;
  adminEventTime: string;
  adminEventLocation: string;
  adminEventDescription: string;
  adminEventImage?: string;
  isEditingEvent: boolean;
  isUploading: boolean;
  notifTitle: string;
  notifBody: string;
  showPending: boolean;
  pendingUsers: PendingUser[];
  sponsors: Sponsor[];
  teams: Team[];
  sponsorName: string;
  sponsorLink: string;
  sponsorLogo?: string;
  isManagingSponsors: boolean;
  onBack: () => void;
  onEventDayChange: (day: string) => void;
  onEventTitleChange: (value: string) => void;
  onEventTimeChange: (value: string) => void;
  onEventLocationChange: (value: string) => void;
  onEventDescriptionChange: (value: string) => void;
  onPickEventImage: () => void;
  onAddEvent: () => void;
  onNotifTitleChange: (value: string) => void;
  onNotifBodyChange: (value: string) => void;
  onSendNotification: () => void;
  onFetchPendingUsers: () => void;
  onApproveUser: (userId: string) => void;
  onOpenVerifications: () => void;
  onOpenPrograms: () => void;
  onOpenUsers: () => void;
  onOpenInvites: () => void;
  onCreateMissingTeams: () => void;
  onNormalizeUserTeamNames: () => void;
  onDeleteTeam: (team: Team) => void;
  onSponsorNameChange: (value: string) => void;
  onSponsorLinkChange: (value: string) => void;
  onPickSponsorLogo: () => void;
  onAddSponsor: () => void;
  onDeleteSponsor: (sponsor: Sponsor) => void;
}

export function AdminDashboardScreen({
  adminEventDay,
  adminEventTitle,
  adminEventTime,
  adminEventLocation,
  adminEventDescription,
  adminEventImage,
  isEditingEvent,
  isUploading,
  notifTitle,
  notifBody,
  showPending,
  pendingUsers,
  sponsors,
  teams,
  sponsorName,
  sponsorLink,
  sponsorLogo,
  isManagingSponsors,
  onBack,
  onEventDayChange,
  onEventTitleChange,
  onEventTimeChange,
  onEventLocationChange,
  onEventDescriptionChange,
  onPickEventImage,
  onAddEvent,
  onNotifTitleChange,
  onNotifBodyChange,
  onSendNotification,
  onFetchPendingUsers,
  onApproveUser,
  onOpenVerifications,
  onOpenPrograms,
  onOpenUsers,
  onOpenInvites,
  onCreateMissingTeams,
  onNormalizeUserTeamNames,
  onDeleteTeam,
  onSponsorNameChange,
  onSponsorLinkChange,
  onPickSponsorLogo,
  onAddSponsor,
  onDeleteSponsor,
}: AdminDashboardScreenProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

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
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🧰 {t('admin.management')}</Text>
            <TouchableOpacity style={styles.outlineButton} onPress={onOpenPrograms}>
              <Text style={styles.outlineButtonText}>📅 {t('admin.managePrograms')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineButton} onPress={onOpenVerifications}>
              <Text style={styles.outlineButtonText}>🎓 {t('more.verification')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineButton} onPress={onOpenUsers}>
              <Text style={styles.outlineButtonText}>👥 {t('admin.registeredUsers')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineButton} onPress={onCreateMissingTeams}>
              <Text style={styles.outlineButtonText}>🛡️ {t('admin.createMissingTeams')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineButton} onPress={onNormalizeUserTeamNames}>
              <Text style={styles.outlineButtonText}>🧹 {t('admin.normalizeUserTeamNames')}</Text>
            </TouchableOpacity>
            <Text style={styles.sectionSubtitle}>{t('admin.manageTeams')}</Text>
            {teams.length === 0 ? (
              <Text style={styles.emptyState}>{t('admin.noTeams')}</Text>
            ) : (
              <View style={styles.teamList}>
                {teams.map((team) => (
                  <View key={team.id} style={styles.teamRow}>
                    <Text style={styles.teamName}>{team.name || team.id}</Text>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => onDeleteTeam(team)}>
                      <Text style={styles.deleteButtonText}>{t('admin.deleteTeam')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity style={[styles.outlineButton, styles.lastOutlineButton]} onPress={onOpenInvites}>
              <Text style={styles.outlineButtonText}>✉️ {t('admin.invites')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🤝 {t('admin.manageSponsors')}</Text>
            <TextInput style={styles.input} placeholder={t('admin.sponsorNamePlaceholder')} placeholderTextColor="#888" value={sponsorName} onChangeText={onSponsorNameChange} />
            <TextInput style={styles.input} placeholder={t('admin.sponsorLinkPlaceholder')} placeholderTextColor="#888" value={sponsorLink} onChangeText={onSponsorLinkChange} autoCapitalize="none" keyboardType="url" />
            <TouchableOpacity style={styles.outlineButton} onPress={onPickSponsorLogo}>
              <Text style={styles.outlineButtonText}>{t('admin.chooseSponsorLogo')}</Text>
            </TouchableOpacity>
            {sponsorLogo && <Image source={{ uri: sponsorLogo }} style={styles.sponsorPreview} resizeMode="contain" />}
            <TouchableOpacity
              style={[styles.solidButton, { opacity: isManagingSponsors ? 0.7 : 1 }]}
              onPress={onAddSponsor}
              disabled={isManagingSponsors}
            >
              <Text style={styles.solidButtonText}>{isManagingSponsors ? t('admin.uploading') : t('admin.addSponsor')}</Text>
            </TouchableOpacity>
            {sponsors.length === 0 ? (
              <Text style={styles.emptyState}>{t('admin.noSponsors')}</Text>
            ) : (
              <View style={styles.sponsorList}>
                {sponsors.map((sponsor) => (
                  <View key={sponsor.id} style={styles.sponsorRow}>
                    <Image source={{ uri: sponsor.logo }} style={styles.sponsorLogo} resizeMode="contain" />
                    <Text style={styles.sponsorName}>{sponsor.name}</Text>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => onDeleteSponsor(sponsor)}>
                      <Text style={styles.deleteButtonText}>{t('admin.deleteSponsor')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 {t(isEditingEvent ? 'admin.editProgram' : 'admin.addProgram')}</Text>
            <Text style={styles.profileLabel}>{t('admin.chooseDay')}</Text>
            <View style={styles.dayList}>
              {EVENT_DAYS.map(day => (
                <FilterChip key={day} label={t(EVENT_DAY_LABEL_KEYS[day as keyof typeof EVENT_DAY_LABEL_KEYS])} selected={adminEventDay === day} onPress={() => onEventDayChange(day)} style={styles.dayChip} />
              ))}
            </View>
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

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📯 {t('admin.sendNotification')}</Text>
            <TextInput style={styles.input} placeholder={t('admin.notificationTitlePlaceholder')} placeholderTextColor="#888" value={notifTitle} onChangeText={onNotifTitleChange} />
            <TextInput style={styles.notificationBody} placeholder={t('admin.notificationBodyPlaceholder')} placeholderTextColor="#888" multiline value={notifBody} onChangeText={onNotifBodyChange} />
            <TouchableOpacity style={styles.solidButton} onPress={onSendNotification}>
              <Text style={styles.solidButtonText}>{t('admin.send')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎓 {t('admin.verifyIds')}</Text>
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
                      <Text style={styles.teamName}>{t('admin.team', { team: user.team || t('profile.individualTeam') })}</Text>
                      <Text style={[styles.verificationStatus, { color: user.isVerified ? '#27AE60' : '#F39C12' }]}>
                        {t('admin.status', { status: user.isVerified ? t('verification.accepted') : t('verification.pending') })}
                      </Text>
                      <Image source={{ uri: user.igazolas }} style={styles.idImage} resizeMode="contain" />
                      {!user.isVerified && (
                        <TouchableOpacity style={styles.approveButton} onPress={() => onApproveUser(user.id)}>
                          <Text style={styles.solidButtonText}>✅ {t('admin.approve')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
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
  sectionSubtitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginTop: 4, marginBottom: 6 },
  profileLabel: { fontSize: 12, color: '#aaa', marginTop: 8 },
  dayList: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, marginTop: 5 },
  dayChip: { marginBottom: 6 },
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
  teamName: { color: '#aaa', fontSize: 12, marginBottom: 5 },
  verificationStatus: { fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  idImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 10 },
  approveButton: { backgroundColor: '#27AE60', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  sponsorPreview: { width: 100, height: 70, alignSelf: 'center', marginBottom: 12 },
  sponsorList: { marginTop: 12 },
  teamList: { marginBottom: 12 },
  teamRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333', paddingVertical: 6 },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333', paddingVertical: 10 },
  sponsorLogo: { width: 48, height: 40, marginRight: 10 },
  sponsorName: { color: '#FFF', flex: 1, fontWeight: '600' },
  deleteButton: { paddingVertical: 8, paddingHorizontal: 10 },
  deleteButtonText: { color: '#EC2127', fontWeight: 'bold' },
  programImagePreview: { width: 120, height: 80, borderRadius: 8, alignSelf: 'center', marginBottom: 12 },
});