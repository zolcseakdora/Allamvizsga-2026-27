import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PHOTO_HUNT_TASKS } from '@/constants/photo-hunt';

type PhotoHuntScreenProps = {
  progress: Record<number, boolean>;
  onBack: () => void;
  onRefresh: () => void;
  onUpload: (taskId: number) => void;
};

export function PhotoHuntScreen({ progress, onBack, onRefresh, onUpload }: PhotoHuntScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← Vissza</Text></TouchableOpacity>
          <TouchableOpacity onPress={onRefresh}><Text style={styles.refreshText}>🔄 Frissítés</Text></TouchableOpacity>
        </View>
        <Text style={styles.title}>📷 PHOTO HUNT</Text>
        <Text style={styles.subtitle}>Minden fotón/videón legalább 2 csapattag szerepeljen!</Text>
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {PHOTO_HUNT_TASKS.map(task => (
            <View key={task.id} style={styles.card}>
              <View style={styles.taskRow}>
                <View style={styles.taskDescription}>
                  <Text style={styles.cardTitle}>{task.title}</Text>
                  <Text style={styles.cardText}>Kritérium: {task.criteria}</Text>
                </View>
                {progress[task.id] ? (
                  <Text style={styles.completeIcon}>✅</Text>
                ) : (
                  <TouchableOpacity style={styles.uploadButton} onPress={() => onUpload(task.id)}>
                    <Text style={styles.uploadButtonText}>Feltöltés</Text>
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
  webWrapper: { width: '100%', maxWidth: 450, flex: 1, padding: 20, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  backText: { color: '#EC2127', fontWeight: 'bold' },
  refreshText: { color: '#27AE60', fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center', letterSpacing: 1, marginTop: 15 },
  subtitle: { fontSize: 13, color: '#aaa', marginBottom: 20, textAlign: 'center' },
  list: { width: '100%' },
  card: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15 },
  taskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskDescription: { flex: 1, paddingRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  cardText: { fontSize: 14, color: '#aaa', lineHeight: 20 },
  completeIcon: { fontSize: 24 },
  uploadButton: { borderWidth: 2, borderColor: '#EC2127', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', backgroundColor: '#1E1E1E' },
  uploadButtonText: { color: '#FFF', fontWeight: 'bold' },
});