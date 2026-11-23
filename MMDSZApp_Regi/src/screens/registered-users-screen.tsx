import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { UserRole } from '@/src/types/auth';
import type { RegisteredUser } from '@/src/hooks/use-admin';
import { isRegistrationReviewPending, registrationStatusLabel, requestedRegistrationRole } from '@/src/utils/registration-review';
import type { EventSeason } from '@/src/constants/event-schedule';

type RegisteredUsersScreenProps = {
  users: RegisteredUser[];
  eventType: EventSeason;
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
  onRefresh: () => void;
  canReviewRegistrations: boolean;
  onReviewRegistration: (userId: string, approved: boolean) => void;
  reviewingUserId?: string;
  onAssignCaptain: (teamKey: string, captainUid: string, captainName: string) => void;
};

export function RegisteredUsersScreen({
  users,
  eventType,
  isLoading,
  error,
  onBack,
  onRefresh,
  canReviewRegistrations,
  onReviewRegistration,
  reviewingUserId,
  onAssignCaptain,
}: RegisteredUsersScreenProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={styles.wrapper}>
        <View style={styles.header}>
          {width < 900 && <TouchableOpacity onPress={onBack}><Text style={styles.back}>← {t('common.back')}</Text></TouchableOpacity>}
          <TouchableOpacity onPress={onRefresh}><Text style={styles.refresh}>🔄 {t('common.refresh')}</Text></TouchableOpacity>
        </View>
        <Text style={styles.title}>👥 {t('users.title')}</Text>
        <ScrollView style={styles.list}>
          {error
            ? <Text style={styles.error}>{t('users.loadError', { message: error })}</Text>
            : isLoading
              ? <Text style={styles.emptyState}>{t('common.loading')}</Text>
              : eventType === 'februtalis' && users.length === 0
                ? <Text style={styles.emptyState}>{t('users.emptyFebrutalis')}</Text>
                : users.map((user) => {
                  // A regisztrációs jóváhagyás csak a Diáknapokra vonatkozik.
                  const pending = eventType === 'diaknapok' && isRegistrationReviewPending(user);
                  const requestedRole = requestedRegistrationRole(user) as UserRole | undefined;
                  const isBusy = reviewingUserId === user.id;
                  return (
                    <View key={user.id} style={styles.card}>
                      <Text style={styles.name}>👤 {user.name || 'Névtelen felhasználó'}</Text>
                      {user.email ? <Text style={styles.detail}>{user.email}</Text> : null}
                      <Text style={styles.detail}>Jelenlegi szerepkör: {translateRole(user.role, t)}</Text>
                      {pending && <Text style={styles.requested}>Kért szerepkör: {translateRole(requestedRole, t)}</Text>}
                      {eventType === 'diaknapok' && (
                        <Text style={styles.detail}>Regisztráció: {registrationStatusLabel(user)}</Text>
                      )}
                      {user.requestedTeamName ? <Text style={styles.detail}>Kért csapat: {user.requestedTeamName}</Text> : null}
                      {eventType === 'februtalis' && user.teamName ? (
                        <Text style={styles.detail}>{t('users.eventTeam', { team: user.teamName })}</Text>
                      ) : null}
                      <Text style={[styles.document, { color: user.igazolas ? '#27AE60' : '#EC2127' }]}>
                        {user.igazolas ? `✅ ${t('users.idUploaded')}` : `❌ ${t('users.noId')}`}
                      </Text>
                      {pending && canReviewRegistrations && (
                        <View style={styles.actions}>
                          <TouchableOpacity disabled={isBusy} onPress={() => onReviewRegistration(user.id, true)} style={[styles.approve, isBusy && styles.disabled]}>
                            <Text style={styles.actionText}>{isBusy ? 'Feldolgozás...' : '✅ Jóváhagyás'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity disabled={isBusy} onPress={() => onReviewRegistration(user.id, false)} style={[styles.reject, isBusy && styles.disabled]}>
                            <Text style={styles.actionText}>❌ Elutasítás</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {eventType === 'februtalis' && user.teamKey ? (
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
                      ) : null}
                    </View>
                  );
                })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function translateRole(role: UserRole | undefined, t: (key: string) => string): string {
  switch (role) {
    case UserRole.FOSZERVEZO: return t('roles.headOrganizer');
    case UserRole.SZERVEZO: return t('roles.organizer');
    case UserRole.ZSURI: return t('roles.jury');
    case UserRole.CSAPATKAPITANY: return t('roles.captain');
    case UserRole.ALCSAPATKAPITANY: return t('roles.deputy');
    case UserRole.CSAPATTAG: return t('roles.member');
    default: return role ?? '—';
  }
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  wrapper: { width: '100%', maxWidth: 1200, flex: 1, padding: 24, alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  back: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  refresh: { color: '#27AE60', fontSize: 15, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginTop: 15 },
  list: { width: '100%', marginTop: 10 },
  card: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 14, marginBottom: 10 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  detail: { color: '#BBB', marginTop: 4 },
  requested: { color: '#F39C12', marginTop: 6, fontWeight: 'bold' },
  document: { marginTop: 6, fontWeight: 'bold' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  approve: { backgroundColor: '#238C55', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 8 },
  reject: { backgroundColor: '#AE252B', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 8 },
  actionText: { color: '#FFF', fontWeight: 'bold' },
  disabled: { opacity: 0.5 },
  emptyState: { color: '#aaa', fontSize: 15, textAlign: 'center', marginTop: 24 },
  error: { color: '#EC2127', fontSize: 14, textAlign: 'center', marginTop: 24 },
  assignCaptainButton: { backgroundColor: '#27AE60', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginTop: 10, alignSelf: 'flex-start' },
  assignCaptainText: { color: '#FFFFFF', fontWeight: 'bold' },
  pendingApproval: { color: '#aaa', fontSize: 12, marginTop: 8 },
});
