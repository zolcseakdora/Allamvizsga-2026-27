import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { FilterChip } from '@/src/components/controls/filter-chip';
import { EVENT_DAYS, EVENT_DAY_LABEL_KEYS } from '@/src/constants/event-days';

type ScheduleProgram = {
  id: string;
  dayId?: string;
  day?: string;
  time?: string;
  helyszín?: string;
  title?: string;
  thumb?: string;
  image?: string;
};

type ScheduleDay = {
  id: string;
  weekday: string;
  date?: string;
};

type ScheduleScreenProps = {
  programs: ScheduleProgram[];
  days?: ScheduleDay[];
  selectedCategory: string;
  onBack: () => void;
  onRefresh: () => void;
  onSelectCategory: (category: string) => void;
  onSelectProgram: (program: ScheduleProgram) => void;
  isAdmin?: boolean;
  onCreateProgram?: () => void;
};

export function ScheduleScreen({
  programs,
  days,
  selectedCategory,
  onBack,
  onRefresh,
  onSelectCategory,
  onSelectProgram,
  isAdmin,
  onCreateProgram,
}: ScheduleScreenProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const visibleDays = days && days.length > 0
    ? days
    : EVENT_DAYS.map((weekday, order) => ({ id: weekday, weekday, date: '', order }));
  const filteredPrograms = programs.filter((program) => program.day === selectedCategory || (program.day === undefined && visibleDays.some((day) => day.id === selectedCategory)));

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={[styles.webWrapper, width < 900 && styles.mobileWebWrapper]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.refreshText}>🔄 {t('common.refresh')}</Text>
          </TouchableOpacity>
          {isAdmin && onCreateProgram && (
            <TouchableOpacity style={styles.createButton} onPress={onCreateProgram}>
              <Text style={styles.createButtonText}>＋ {t('programs.newEvent')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.title, width < 900 && styles.mobileTitle]}>📅 {t('programs.title')}</Text>

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            {visibleDays.map((day) => (
              <FilterChip
                key={day.id}
                label={t(EVENT_DAY_LABEL_KEYS[day.weekday as keyof typeof EVENT_DAY_LABEL_KEYS] ?? day.weekday)}
                selected={selectedCategory === day.id}
                onPress={() => onSelectCategory(day.id)}
              />
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.programList}
          contentContainerStyle={styles.programListContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredPrograms.length === 0 ? (
            <Text style={styles.emptyState}>{t('programs.empty')}</Text>
          ) : (
            <View style={[styles.programGrid, width >= 900 && styles.desktopProgramGrid]}>
              {filteredPrograms.map(program => (
                <TouchableOpacity
                  key={program.id}
                  style={[styles.programCard, width >= 900 && styles.desktopProgramCard]}
                  onPress={() => onSelectProgram(program)}
                >
                  <View style={styles.timeLine}>
                    <Text style={styles.timeText}>{program.time}</Text>
                    <View style={styles.timelineLine} />
                  </View>
                  <View style={styles.programInfo}>
                    <View style={styles.programText}>
                      <Text style={styles.programTitle} numberOfLines={2}>{program.title}</Text>
                      <Text style={styles.programDetail} numberOfLines={1}>📍 {program.helyszín || t('programs.locationComing')}</Text>
                    </View>
                    {(program.thumb ?? program.image) && (
                      <Image source={{ uri: (program.thumb ?? program.image)! }} style={styles.programThumb} resizeMode="cover" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
  backText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  refreshText: { color: '#27AE60', fontSize: 15, fontWeight: 'bold' },
  createButton: { backgroundColor: '#EC2127', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 13 },
  createButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'left', letterSpacing: 1, marginTop: 15 },
  mobileTitle: { marginTop: 0 },
  filterContainer: { height: 45, marginVertical: 8, justifyContent: 'center' },
  filterContent: { paddingVertical: 4 },
  programList: { flex: 1, width: '100%', marginTop: 5 },
  programListContent: { paddingBottom: 16, alignItems: 'center' },
  emptyState: { textAlign: 'center', marginTop: 20, color: '#888' },
  programGrid: { width: '100%', alignItems: 'center' },
  desktopProgramGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start' },
  programCard: { width: '100%', maxWidth: 560, minHeight: 88, flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 10, marginBottom: 10 },
  desktopProgramCard: { width: '48%' },
  timeLine: { width: 76, alignItems: 'flex-start', paddingTop: 5, marginRight: 10 },
  timeText: { color: '#FFF', fontWeight: 'bold', fontSize: 20 },
  timelineLine: { width: 2, flex: 1, minHeight: 24, backgroundColor: '#EC2127', marginLeft: 7, marginTop: 5 },
  programInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  programText: { flex: 1, justifyContent: 'center', minWidth: 0 },
  programTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 5 },
  programDetail: { fontSize: 12, color: '#aaa' },
  programThumb: { width: 68, height: 68, borderRadius: 6, marginLeft: 8 },
});