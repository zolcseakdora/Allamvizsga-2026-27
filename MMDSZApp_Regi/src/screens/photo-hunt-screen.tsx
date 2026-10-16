import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { PHOTO_HUNT_TASKS } from '@/src/constants/photo-hunt';

type PhotoHuntScreenProps = {
  progress: Record<number, boolean>;
  uploadingTaskId: number | null;
  onBack: () => void;
  onRefresh: () => void;
  onUpload: (taskId: number) => void;
};

export function PhotoHuntScreen({ progress, uploadingTaskId, onBack, onRefresh, onUpload }: PhotoHuntScreenProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={[styles.webWrapper, width < 900 && styles.mobileWebWrapper]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onRefresh}><Text style={styles.refreshText}>🔄 {t('common.refresh')}</Text></TouchableOpacity>
        </View>
        <Text style={[styles.title, width < 900 && styles.mobileTitle]}>📷 {t('photoHunt.title')}</Text>
        <Text style={styles.subtitle}>{t('photoHunt.subtitle')}</Text>
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {PHOTO_HUNT_TASKS.map(task => (
            <View key={task.id} style={styles.card}>
              <View style={styles.taskRow}>
                <View style={styles.taskDescription}>
                  <Text style={styles.cardTitle}>{t(`photoHunt.tasks.${task.id}.title`)}</Text>
                  <Text style={styles.cardText}>{t('photoHunt.criteria', { criteria: t(`photoHunt.tasks.${task.id}.criteria`) })}</Text>
                </View>
                {progress[task.id] ? (
                  <Text style={styles.completeIcon}>✅</Text>
                ) : (
                  <TouchableOpacity style={styles.uploadButton} onPress={() => onUpload(task.id)} disabled={uploadingTaskId !== null}>
                    <Text style={styles.uploadButtonText}>{uploadingTaskId === task.id ? t('common.uploading') : t('common.upload')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 1200, flex: 1, padding: 24, alignSelf: 'flex-start' },
  mobileWebWrapper: { paddingTop: 12, paddingHorizontal: 12, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  backText: { color: '#EC2127', fontWeight: 'bold' },
  refreshText: { color: '#27AE60', fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center', letterSpacing: 1, marginTop: 15 },
  mobileTitle: { marginTop: 0 },
  subtitle: { fontSize: 13, color: '#aaa', marginBottom: 20, textAlign: 'center' },
  list: { flex: 1, width: '100%' },
  listContent: { paddingBottom: 16 },
  card: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15 },
  taskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskDescription: { flex: 1, paddingRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  cardText: { fontSize: 14, color: '#aaa', lineHeight: 20 },
  completeIcon: { fontSize: 24 },
  uploadButton: { borderWidth: 2, borderColor: '#EC2127', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', backgroundColor: '#1E1E1E' },
  uploadButtonText: { color: '#FFF', fontWeight: 'bold' },
});