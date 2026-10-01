import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FilterChip } from '@/components/filter-chip';
import { EVENT_DAYS, EVENT_DAY_LABEL_KEYS } from '@/constants/event-days';

type ScheduleProgram = {
  id: string;
  day?: string;
  time?: string;
  helyszín?: string;
  title?: string;
};

type ScheduleScreenProps = {
  programs: ScheduleProgram[];
  selectedCategory: string;
  onBack: () => void;
  onRefresh: () => void;
  onSelectCategory: (category: string) => void;
  onSelectProgram: (program: ScheduleProgram) => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
};

export function ScheduleScreen({
  programs,
  selectedCategory,
  onBack,
  onRefresh,
  onSelectCategory,
  onSelectProgram,
  isAdmin,
}: ScheduleScreenProps) {
  const { t } = useTranslation();
  const filteredPrograms = programs.filter(program => program.day === selectedCategory);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.refreshText}>🔄 {t('common.refresh')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>📅 {t('programs.title')}</Text>

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            {EVENT_DAYS.map(category => (
              <FilterChip
                key={category}
                label={t(EVENT_DAY_LABEL_KEYS[category as keyof typeof EVENT_DAY_LABEL_KEYS])}
                selected={selectedCategory === category}
                onPress={() => onSelectCategory(category)}
              />
            ))}
          </ScrollView>
        </View>

        <ScrollView style={styles.programList} showsVerticalScrollIndicator={false}>
          {filteredPrograms.length === 0 ? (
            <Text style={styles.emptyState}>{t('programs.empty')}</Text>
          ) : (
            filteredPrograms.map(program => (
              <TouchableOpacity key={program.id} style={styles.programCard} onPress={() => onSelectProgram(program)}>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeText}>{program.time}</Text>
                </View>
                <Text style={styles.programDetail}>📍 {program.helyszín || t('programs.locationComing')}</Text>
                <Text style={styles.programTitle}>{program.title}</Text>
              </TouchableOpacity>
            ))
          )}
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
  refreshText: { color: '#27AE60', fontSize: 15, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'left', letterSpacing: 1, marginTop: 15 },
  filterContainer: { height: 45, marginVertical: 8, justifyContent: 'center' },
  filterContent: { paddingVertical: 4 },
  programList: { width: '100%', marginTop: 5 },
  emptyState: { textAlign: 'center', marginTop: 20, color: '#888' },
  programCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 14, marginBottom: 12 },
  timeBadge: { alignSelf: 'flex-start', backgroundColor: '#EC2127', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 6, alignItems: 'center', justifyContent: 'center' },
  timeText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  programTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginTop: 4 },
  programDetail: { fontSize: 13, color: '#aaa', marginBottom: 4 },
});