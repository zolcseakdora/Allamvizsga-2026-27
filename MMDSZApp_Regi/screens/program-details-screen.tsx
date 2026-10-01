import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EVENT_DAY_LABEL_KEYS } from '@/constants/event-days';

type ProgramDetails = {
  title?: string;
  time?: string;
  helyszín?: string;
  day?: string;
  image?: string;
  description?: string;
};

type ProgramDetailsScreenProps = {
  program: ProgramDetails;
  onBack: () => void;
};

export function ProgramDetailsScreen({ program, onBack }: ProgramDetailsScreenProps) {
  const { t } = useTranslation();
  const dayLabel = program.day && program.day in EVENT_DAY_LABEL_KEYS
    ? t(EVENT_DAY_LABEL_KEYS[program.day as keyof typeof EVENT_DAY_LABEL_KEYS])
    : program.day;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t('programs.backToSchedule')}</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{program.title}</Text>
          <View style={styles.timeBadge}>
            <Text style={styles.timeText}>{program.time}</Text>
          </View>
          <Text style={styles.programDetail}>📍 {program.helyszín || t('programs.locationComing')} | {dayLabel}</Text>

          {program.image ? (
            <Image source={{ uri: program.image }} style={styles.programImage} resizeMode="cover" />
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('programs.details')}</Text>
            <Text style={styles.cardText}>{program.description || t('programs.noDetails')}</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 450, flex: 1, padding: 20, justifyContent: 'center' },
  backButton: { marginBottom: 15 },
  backButtonText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 10, textAlign: 'left', letterSpacing: 1 },
  timeBadge: { alignSelf: 'flex-start', backgroundColor: '#EC2127', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 10, alignItems: 'center', justifyContent: 'center' },
  timeText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  programDetail: { fontSize: 13, color: '#aaa', marginBottom: 4 },
  programImage: { width: '100%', height: 220, borderRadius: 10, marginVertical: 15 },
  card: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  cardText: { fontSize: 14, color: '#aaa', lineHeight: 20 },
});