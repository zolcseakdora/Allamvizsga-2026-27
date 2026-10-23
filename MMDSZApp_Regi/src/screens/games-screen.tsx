import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { GameEntry } from '@/src/constants/games';
import { getGameText } from '@/src/constants/games';

type GamesScreenProps = {
  title: string;
  subtitle: string;
  items: GameEntry[];
  onBack?: () => void;
  onSelect: (item: GameEntry) => void;
};

export function GamesScreen({ title, subtitle, items, onBack, onSelect }: GamesScreenProps) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const columns = width < 600 ? 2 : 3;
  const cardWidth = `${100 / columns - 1.5}%` as `${number}%`;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={[styles.webWrapper, width < 900 && styles.mobileWebWrapper]}>
        <View style={styles.headerRow}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} accessibilityRole="button">
              <Text style={styles.backButtonText}>← {t('common.back')}</Text>
            </TouchableOpacity>
          ) : <View />}
        </View>
        <Text style={[styles.title, width < 900 && styles.mobileTitle]}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {items.length > 0 ? (
          <ScrollView
            style={styles.folderList}
            contentContainerStyle={styles.folderGrid}
            showsVerticalScrollIndicator={false}
          >
            {items.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.folderCard, { width: cardWidth, minWidth: width >= 900 ? 220 : 0 }]}
                onPress={() => onSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={getGameText(item.title, i18n.language)}
              >
                <Text style={styles.folderIcon}>{item.icon}</Text>
                <Text style={styles.folderName} numberOfLines={2}>
                  {getGameText(item.title, i18n.language)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{t('games.notFound')}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 1200, flex: 1, padding: 24, alignSelf: 'flex-start' },
  mobileWebWrapper: { paddingTop: 12, paddingHorizontal: 12, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, minHeight: 22 },
  backButtonText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center', letterSpacing: 1, marginTop: 15 },
  mobileTitle: { marginTop: 0 },
  subtitle: { fontSize: 13, color: '#aaa', marginBottom: 20, textAlign: 'center' },
  folderList: { flex: 1, width: '100%', marginTop: 10 },
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 16 },
  folderCard: { height: 160, backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  folderIcon: { fontSize: 36, marginBottom: 8 },
  folderName: { color: '#FFF', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { color: '#888', textAlign: 'center' },
});
