import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { UserRole } from '@/src/types/auth';
import type { EventSeason } from '@/src/constants/event-schedule';

type RegisteredUser = {
  id: string;
  name?: string;
  role?: UserRole;
  igazolas?: string;
  teamName?: string;
  teamKey?: string;
  isVerified?: boolean;
  isFebrutalisCaptain?: boolean;
};

type RegisteredUsersScreenProps = {
  users: RegisteredUser[];
  eventType: EventSeason;
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
  onRefresh: () => void;
  onAssignCaptain: (teamKey: string, captainUid: string, captainName: string) => void;
};

export function RegisteredUsersScreen({
  users,
  eventType,
  isLoading,
  error,
  onBack,
  onRefresh,
  onAssignCaptain,
}: RegisteredUsersScreenProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.headerRow}>
          {width < 900 && <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← {t('common.back')}</Text></TouchableOpacity>}
          <TouchableOpacity onPress={onRefresh}><Text style={styles.refreshText}>🔄 {t('common.refresh')}</Text></TouchableOpacity>
        </View>
        <Text style={styles.title}>👥 {t('users.title')}</Text>
        <ScrollView style={styles.list}>
          {error
            ? <Text style={styles.error}>{t('users.loadError', { message: error })}</Text>
            : isLoading
              ? <Text style={styles.emptyState}>{t('common.loading')}</Text>
              : eventType === 'februtalis' && users.length === 0
            ? <Text style={styles.emptyState}>{t('users.emptyFebrutalis')}</Text>
            : users.map(user => (
              <View key={user.id} style={styles.userCard}>
                <Text style={styles.userName}>👤 {user.name}</Text>
                <Text style={styles.userRole}>{t('users.role', { role: translateRole(user.role, t) })}</Text>
                {eventType === 'februtalis' && user.teamName && (
                  <Text style={styles.userRole}>{t('users.eventTeam', { team: user.teamName })}</Text>
                )}
                <Text style={[styles.verification, { color: user.igazolas ? '#27AE60' : '#EC2127' }]}>
                  {user.igazolas ? `✅ ${t('users.idUploaded')}` : `❌ ${t('users.noId')}`}
                </Text>
                {eventType === 'februtalis' && user.teamKey && (
                  user.isVerified
                    ? (
                      <TouchableOpacity
                        style={styles.assignCaptainButton}
                        onPress={() => {
                          if (user.teamKey) onAssignCaptain(user.teamKey, user.id, user.name ?? '');
                        }}
                      >
                        <Text style={styles.assignCaptainText}>
                          {t(user.isFebrutalisCaptain
                            ? 'admin.changeFebrutalisCaptain'
                            : 'admin.assignFebrutalisCaptain')}
                        </Text>
                      </TouchableOpacity>
                    )
                    : <Text style={styles.pendingApproval}>{t('admin.captainRequiresApproval')}</Text>
                )}
              </View>
            ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function translateRole(role: UserRole | undefined, t: (key: string) => string) {
  switch (role) {
    case UserRole.FOSZERVEZO: return t('roles.headOrganizer');
    case UserRole.SZERVEZO: return t('roles.organizer');
    case UserRole.CSAPATKAPITANY: return t('roles.captain');
    case UserRole.ALCSAPATKAPITANY: return t('roles.deputy');
    case UserRole.CSAPATTAG: return t('roles.member');
    default: return role ?? '';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 1200, flex: 1, padding: 24, alignSelf: 'flex-start' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  backText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  refreshText: { color: '#27AE60', fontSize: 15, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center', letterSpacing: 1, marginTop: 15 },
  list: { width: '100%', marginTop: 10 },
  userCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 14, marginBottom: 10 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  userRole: { fontSize: 14, color: '#aaa' },
  verification: { marginTop: 4, fontWeight: 'bold' },
  emptyState: { color: '#aaa', fontSize: 15, textAlign: 'center', marginTop: 24 },
  error: { color: '#EC2127', fontSize: 14, textAlign: 'center', marginTop: 24 },
  assignCaptainButton: { backgroundColor: '#27AE60', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginTop: 10, alignSelf: 'flex-start' },
  assignCaptainText: { color: '#FFFFFF', fontWeight: 'bold' },
  pendingApproval: { color: '#aaa', fontSize: 12, marginTop: 8 },
});