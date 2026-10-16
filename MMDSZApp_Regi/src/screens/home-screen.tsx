import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

type HomeScreenProps = {
  emailVerified: boolean;
  isCheckingEmail: boolean;
  isResendingEmail: boolean;
  timeLeft: { days: number; hours: number; minutes: number };
  showIgazolasUpload: boolean;
  hasIgazolas: boolean;
  isVerified: boolean;
  onUploadIgazolas: () => void;
  onResendVerificationEmail: () => void;
  onConfirmEmail: () => void;
};

export function HomeScreen({
  emailVerified,
  isCheckingEmail,
  isResendingEmail,
  timeLeft,
  showIgazolasUpload,
  hasIgazolas,
  isVerified,
  onUploadIgazolas,
  onResendVerificationEmail,
  onConfirmEmail,
}: HomeScreenProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isWideDesktop = width >= 1200;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={styles.webWrapper}>
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, !isDesktop && styles.mobileScrollContainer]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.countdownCard}>
            <Text style={styles.countdownTitle}>🎉 {t('home.countdownTitle')}</Text>
            <Text style={styles.countdownSub}>{t('home.date')}</Text>
            <View style={styles.timerRow}>
              <View style={styles.timeBox}><Text style={styles.timeValue}>{timeLeft.days}</Text><Text style={styles.timeLabel}>{t('home.days')}</Text></View>
              <View style={styles.timeBox}><Text style={styles.timeValue}>{timeLeft.hours}</Text><Text style={styles.timeLabel}>{t('home.hours')}</Text></View>
              <View style={styles.timeBox}><Text style={styles.timeValue}>{timeLeft.minutes}</Text><Text style={styles.timeLabel}>{t('home.minutes')}</Text></View>
            </View>
          </View>

          <View style={[styles.newsGrid, isDesktop && styles.desktopNewsGrid]}>
            <View style={[styles.newsCard, !isDesktop && styles.mobileNewsCard, isDesktop && styles.desktopNewsCard, isWideDesktop && styles.desktopNewsCardWide]}>
              <Text style={styles.newsBadge}>🚩 {t('home.paradeTime')}</Text>
              <Text style={styles.cardTitle}>{t('home.paradeTitle')}</Text>
              <Text style={styles.cardText}>{t('home.paradeBody')}</Text>
              <View style={styles.bandImageFrame}>
                <Image source={require('@/assets/images/felvonulas.png')} style={StyleSheet.absoluteFill} resizeMode="cover" />
              </View>
            </View>
            <View style={[styles.newsCard, !isDesktop && styles.mobileNewsCard, isDesktop && styles.desktopNewsCard, isWideDesktop && styles.desktopNewsCardWide]}>
              <Text style={[styles.newsBadge, styles.concertBadge]}>🎸 {t('home.concertTime')}</Text>
              <Text style={styles.cardTitle}>{t('home.concertTitle')}</Text>
              <Text style={styles.cardText}>{t('home.concertBody')}</Text>
              <View style={styles.bandImageFrame}>
                <Image source={require('@/assets/images/dondi.png')} style={StyleSheet.absoluteFill} resizeMode="cover" />
              </View>
            </View>
          </View>

          {!emailVerified && (
            <View style={styles.emailWarningCard}>
              <Text style={styles.emailWarningTitle}>⚠️ {t('verification.emailWarning')}</Text>
              <Text style={styles.cardText}>{t('verification.emailPending')}</Text>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={onResendVerificationEmail}
                disabled={isResendingEmail}
              >
                <Text style={styles.outlineButtonText}>
                  {isResendingEmail ? t('verification.resendingEmail') : t('verification.resendEmail')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={onConfirmEmail}
                disabled={isCheckingEmail}
              >
                <Text style={styles.outlineButtonText}>
                  {isCheckingEmail ? t('verification.checkingEmail') : t('verification.confirmEmail')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

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

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 1200, flex: 1, paddingHorizontal: 24, alignSelf: 'flex-start' },
  scrollContainer: { flexGrow: 1, paddingVertical: 24, paddingBottom: 36 },
  mobileScrollContainer: { paddingTop: 12, paddingBottom: 16 },
  emailWarningCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#F39C12', borderRadius: 10, padding: 16, marginBottom: 15 },
  emailWarningTitle: { fontSize: 16, fontWeight: 'bold', color: '#F39C12', textAlign: 'center', marginBottom: 8 },
  countdownCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 15 },
  countdownTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold', letterSpacing: 0.5, textAlign: 'center' },
  countdownSub: { color: '#aaa', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  timerRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  timeBox: { backgroundColor: '#121212', borderRadius: 8, padding: 8, width: '30%', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  timeValue: { color: '#EC2127', fontSize: 18, fontWeight: 'bold' },
  timeLabel: { color: '#FFF', fontSize: 11 },
  newsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  desktopNewsGrid: { justifyContent: 'flex-start', alignItems: 'flex-start', gap: 16 },
  newsCard: { width: '100%', backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15, overflow: 'hidden' },
  mobileNewsCard: { width: '100%', minWidth: 0, flexBasis: '100%', padding: 16 },
  desktopNewsCard: { width: '48%', flexBasis: '48%', minWidth: 0, flexGrow: 0, marginBottom: 0 },
  desktopNewsCardWide: { width: '32%', flexBasis: '32%' },
  newsBadge: { alignSelf: 'flex-start', backgroundColor: '#EC2127', color: '#FFF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  concertBadge: { backgroundColor: '#27AE60' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  cardText: { fontSize: 14, color: '#aaa', lineHeight: 20 },
  bandImageFrame: { width: '100%', aspectRatio: 16 / 9, borderRadius: 8, marginTop: 10, overflow: 'hidden' },
  studentCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15, alignItems: 'center' },
  verificationStatus: { fontWeight: 'bold', marginTop: 5 },
  outlineButton: { borderWidth: 2, borderColor: '#EC2127', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center', marginBottom: 14, backgroundColor: '#1E1E1E' },
  outlineButtonText: { color: '#FFF', fontWeight: 'bold' },
});