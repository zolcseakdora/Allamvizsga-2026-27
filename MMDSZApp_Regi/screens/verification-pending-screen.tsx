import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type VerificationPendingScreenProps = {
  hasIgazolas: boolean;
  onUploadIgazolas: () => void;
  onLogout: () => void;
};

export function VerificationPendingScreen({ hasIgazolas, onUploadIgazolas, onLogout }: VerificationPendingScreenProps) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.card}>
          <Text style={styles.title}>⏳ {t('verification.title')}</Text>
          <Text style={styles.cardText}>
            {t('verification.message')}
          </Text>

          {!hasIgazolas ? (
            <TouchableOpacity style={styles.solidButton} onPress={onUploadIgazolas}>
              <Text style={styles.solidButtonText}>📸 {t('verification.uploadId')}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.uploadedText}>✅ {t('verification.uploaded')}</Text>
          )}

          <TouchableOpacity style={styles.outlineButton} onPress={onLogout}>
            <Text style={styles.outlineButtonText}>{t('common.logout')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 450, flex: 1, padding: 20, justifyContent: 'center' },
  card: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#F39C12', marginBottom: 6, textAlign: 'center', letterSpacing: 1 },
  cardText: { fontSize: 14, color: '#aaa', lineHeight: 20, textAlign: 'center', marginVertical: 15 },
  solidButton: { backgroundColor: '#EC2127', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  solidButtonText: { color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
  uploadedText: { color: '#27AE60', textAlign: 'center', fontWeight: 'bold', marginBottom: 15 },
  outlineButton: { borderWidth: 2, borderColor: '#EC2127', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center', marginBottom: 14, backgroundColor: '#1E1E1E', marginTop: 10 },
  outlineButtonText: { color: '#FFF', fontWeight: 'bold' },
});