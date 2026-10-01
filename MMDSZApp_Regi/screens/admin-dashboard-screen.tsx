import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FilterChip } from '@/components/filter-chip';
import { EVENT_DAYS, EVENT_DAY_LABEL_KEYS } from '@/constants/event-days';

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
  isUploading: boolean;
  notifTitle: string;
  notifBody: string;
  showPending: boolean;
  pendingUsers: PendingUser[];
  onBack: () => void;
  onEventDayChange: (day: string) => void;
  onEventTitleChange: (value: string) => void;
  onEventTimeChange: (value: string) => void;
  onEventLocationChange: (value: string) => void;
  onAddEvent: () => void;
  onNotifTitleChange: (value: string) => void;
  onNotifBodyChange: (value: string) => void;
  onSendNotification: () => void;
  onFetchPendingUsers: () => void;
  onApproveUser: (userId: string) => void;
};

export function AdminDashboardScreen({
  adminEventDay,
  adminEventTitle,
  adminEventTime,
  adminEventLocation,
  isUploading,
  notifTitle,
  notifBody,
  showPending,
  pendingUsers,
  onBack,
  onEventDayChange,
  onEventTitleChange,
  onEventTimeChange,
  onEventLocationChange,
  onAddEvent,
  onNotifTitleChange,
  onNotifBodyChange,
  onSendNotification,
  onFetchPendingUsers,
  onApproveUser,
}: AdminDashboardScreenProps) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>⚙️ {t('admin.title')}</Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 {t('admin.addProgram')}</Text>
            <Text style={styles.profileLabel}>{t('admin.chooseDay')}</Text>
            <View style={styles.dayList}>
              {EVENT_DAYS.map(day => (
                <FilterChip key={day} label={t(EVENT_DAY_LABEL_KEYS[day as keyof typeof EVENT_DAY_LABEL_KEYS])} selected={adminEventDay === day} onPress={() => onEventDayChange(day)} style={styles.dayChip} />
              ))}
            </View>
            <TextInput style={styles.input} placeholder={t('admin.programTitlePlaceholder')} placeholderTextColor="#888" value={adminEventTitle} onChangeText={onEventTitleChange} />
            <TextInput style={styles.input} placeholder={t('admin.timePlaceholder')} placeholderTextColor="#888" value={adminEventTime} onChangeText={onEventTimeChange} />
            <TextInput style={styles.input} placeholder={t('admin.locationPlaceholder')} placeholderTextColor="#888" value={adminEventLocation} onChangeText={onEventLocationChange} />
            <TouchableOpacity style={[styles.solidButton, { opacity: isUploading ? 0.7 : 1 }]} onPress={onAddEvent} disabled={isUploading}>
              <Text style={styles.solidButtonText}>{isUploading ? t('admin.uploading') : t('admin.saveProgram')}</Text>
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
  webWrapper: { width: '100%', maxWidth: 450, flex: 1, padding: 20, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  backText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#EC2127', marginBottom: 6, textAlign: 'center', letterSpacing: 1, marginTop: 15 },
  scroll: { width: '100%' },
  card: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  profileLabel: { fontSize: 12, color: '#aaa', marginTop: 8 },
  dayList: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, marginTop: 5 },
  dayChip: { marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#1E1E1E', color: '#FFF' },
  notificationBody: { height: 70, textAlignVertical: 'top', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#1E1E1E', color: '#FFF' },
  solidButton: { backgroundColor: '#EC2127', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  solidButtonText: { color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
  outlineButton: { borderWidth: 2, borderColor: '#EC2127', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center', marginBottom: 14, backgroundColor: '#1E1E1E' },
  outlineButtonText: { color: '#FFF', fontWeight: 'bold' },
  pendingList: { marginTop: 10 },
  emptyState: { color: '#888', textAlign: 'center', marginTop: 10 },
  pendingUserCard: { backgroundColor: '#121212', padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#333' },
  pendingUserName: { color: '#FFF', fontWeight: 'bold' },
  teamName: { color: '#aaa', fontSize: 12, marginBottom: 5 },
  verificationStatus: { fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  idImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 10 },
  approveButton: { backgroundColor: '#27AE60', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
});