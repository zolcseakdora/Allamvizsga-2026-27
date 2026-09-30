import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MenuButton } from '@/components/menu-button';

type HomeScreenProps = {
  userRole: string;
  timeLeft: { days: number; hours: number; minutes: number };
  showIgazolasUpload: boolean;
  hasIgazolas: boolean;
  isVerified: boolean;
  isCaptainOrDeputy: boolean;
  isOrganizerOrHead: boolean;
  onOpenProfile: () => void;
  onLogout: () => void;
  onUploadIgazolas: () => void;
  onOpenSchedule: () => void;
  onOpenTeams: () => void;
  onOpenMap: () => void;
  onOpenGallery: () => void;
  onOpenPhotoHunt: () => void;
  onOpenTeamManagement: () => void;
  onOpenRegisteredUsers: () => void;
  onOpenAdmin: () => void;
};

export function HomeScreen({
  userRole,
  timeLeft,
  showIgazolasUpload,
  hasIgazolas,
  isVerified,
  isCaptainOrDeputy,
  isOrganizerOrHead,
  onOpenProfile,
  onLogout,
  onUploadIgazolas,
  onOpenSchedule,
  onOpenTeams,
  onOpenMap,
  onOpenGallery,
  onOpenPhotoHunt,
  onOpenTeamManagement,
  onOpenRegisteredUsers,
  onOpenAdmin,
}: HomeScreenProps) {
  const { t } = useTranslation();
  const translatedRole = userRole === 'Főszervező'
    ? t('roles.headOrganizer')
    : userRole === 'Szervező'
      ? t('roles.organizer')
      : userRole === 'Csapatkapitány'
        ? t('roles.captain')
        : userRole === 'Alcsapatkapitány'
          ? t('roles.deputy')
          : userRole === 'Csapattag'
            ? t('roles.member')
            : userRole;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('home.title')} ⛺</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={onOpenProfile} style={styles.profileButton}><Text style={styles.profileText}>{t('home.profile')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={onLogout}><Text style={styles.logoutText}>{t('common.logout')}</Text></TouchableOpacity>
            </View>
          </View>
          <Text style={styles.subtitle}>{t('home.signedInAs')} <Text style={styles.roleText}>{translatedRole}</Text></Text>

          <View style={styles.countdownCard}>
            <Text style={styles.countdownTitle}>🎉 {t('home.countdownTitle')}</Text>
            <Text style={styles.countdownSub}>{t('home.date')}</Text>
            <View style={styles.timerRow}>
              <View style={styles.timeBox}><Text style={styles.timeValue}>{timeLeft.days}</Text><Text style={styles.timeLabel}>{t('home.days')}</Text></View>
              <View style={styles.timeBox}><Text style={styles.timeValue}>{timeLeft.hours}</Text><Text style={styles.timeLabel}>{t('home.hours')}</Text></View>
              <View style={styles.timeBox}><Text style={styles.timeValue}>{timeLeft.minutes}</Text><Text style={styles.timeLabel}>{t('home.minutes')}</Text></View>
            </View>
          </View>

          <View style={styles.newsCard}>
            <Text style={styles.newsBadge}>🚩 {t('home.paradeTime')}</Text>
            <Text style={styles.cardTitle}>{t('home.paradeTitle')}</Text>
            <Text style={styles.cardText}>{t('home.paradeBody')}</Text>
            <Image source={require('../app/(tabs)/felvonulas.png')} style={styles.bandImage} resizeMode="cover" />
          </View>
          <View style={styles.newsCard}>
            <Text style={[styles.newsBadge, styles.concertBadge]}>🎸 {t('home.concertTime')}</Text>
            <Text style={styles.cardTitle}>{t('home.concertTitle')}</Text>
            <Text style={styles.cardText}>{t('home.concertBody')}</Text>
            <Image source={require('../app/(tabs)/dondi.png')} style={styles.bandImage} resizeMode="cover" />
          </View>

          {showIgazolasUpload && (
            <View style={styles.studentCard}>
              <Text style={styles.cardTitle}>🎓 {t('home.studentCard')}</Text>
              {hasIgazolas ? (
                <Text style={[styles.verificationStatus, { color: isVerified ? '#27AE60' : '#F39C12' }]}>
                  {isVerified ? `✅ ${t('verification.accepted')}` : `⏳ ${t('verification.pending')}`}
                </Text>
              ) : (
                <TouchableOpacity style={styles.outlineButton} onPress={onUploadIgazolas}>
                  <Text style={styles.outlineButtonText}>📸 {t('home.uploadPhoto')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.menuGrid}>
            <MenuButton icon="📅" label={t('home.menuPrograms')} onPress={onOpenSchedule} />
            <MenuButton icon="🛡️" label={t('home.menuTeams')} onPress={onOpenTeams} />
            <MenuButton icon="🗺️" label={t('home.menuMap')} onPress={onOpenMap} />
            <MenuButton icon="📸" label={t('home.menuGallery')} onPress={onOpenGallery} />
            <MenuButton icon="📷" label={t('home.menuPhotoHunt')} onPress={onOpenPhotoHunt} />
            {isCaptainOrDeputy && <MenuButton icon="⚙️" label={t('home.menuTeamManagement')} onPress={onOpenTeamManagement} />}
            {isOrganizerOrHead && <MenuButton icon="👥" label={t('home.menuUsers')} onPress={onOpenRegisteredUsers} />}
            {userRole === 'Főszervező' && <MenuButton icon="⚙️" label={t('home.menuAdmin')} onPress={onOpenAdmin} />}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 450, flex: 1, padding: 20, justifyContent: 'center' },
  scrollContainer: { flexGrow: 1, paddingVertical: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center', letterSpacing: 1 },
  profileButton: { marginRight: 15 },
  profileText: { color: '#EC2127', fontWeight: 'bold' },
  logoutText: { color: '#888', fontWeight: 'bold' },
  subtitle: { fontSize: 13, color: '#aaa', marginBottom: 20, textAlign: 'center' },
  roleText: { fontWeight: 'bold', color: '#EC2127' },
  countdownCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 15 },
  countdownTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold', letterSpacing: 0.5 },
  countdownSub: { color: '#aaa', fontSize: 13, marginBottom: 10 },
  timerRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  timeBox: { backgroundColor: '#121212', borderRadius: 8, padding: 8, width: '30%', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  timeValue: { color: '#EC2127', fontSize: 18, fontWeight: 'bold' },
  timeLabel: { color: '#FFF', fontSize: 11 },
  newsCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15 },
  newsBadge: { alignSelf: 'flex-start', backgroundColor: '#EC2127', color: '#FFF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  concertBadge: { backgroundColor: '#27AE60' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  cardText: { fontSize: 14, color: '#aaa', lineHeight: 20 },
  bandImage: { width: '100%', height: 180, borderRadius: 8, marginTop: 10 },
  studentCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15, alignItems: 'center' },
  verificationStatus: { fontWeight: 'bold', marginTop: 5 },
  outlineButton: { borderWidth: 2, borderColor: '#EC2127', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center', marginBottom: 14, backgroundColor: '#1E1E1E' },
  outlineButtonText: { color: '#FFF', fontWeight: 'bold' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
});