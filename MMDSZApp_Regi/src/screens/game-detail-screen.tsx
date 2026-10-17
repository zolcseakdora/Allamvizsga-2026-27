import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { GameEntry } from '@/src/constants/games';
import { getGameText } from '@/src/constants/games';

type GameDetailScreenProps = {
  game: GameEntry | undefined;
  showScoring: boolean;
  onBack: () => void;
};

export function GameDetailScreen({ game, showScoring, onBack }: GameDetailScreenProps) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={[styles.webWrapper, width < 900 && styles.mobileWebWrapper]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} accessibilityRole="button">
            <Text style={styles.backButtonText}>← {t('common.back')}</Text>
          </TouchableOpacity>
        </View>
        {game ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.icon}>{game.icon}</Text>
            <Text style={[styles.title, width < 900 && styles.mobileTitle]}>
              {getGameText(game.title, i18n.language)}
            </Text>
            <Text style={styles.description}>{getGameText(game.description, i18n.language)}</Text>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('games.schedule')}</Text>
              <Text style={styles.sectionText}>{t('games.schedulePlaceholder')}</Text>
            </View>
            {showScoring && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('games.scoring')}</Text>
                <Text style={styles.sectionText}>{t('games.comingSoon')}</Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.notFound}>
            <Text style={styles.sectionText}>{t('games.notFound')}</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, minHeight: 22 },
  backButtonText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  content: { alignItems: 'center', paddingBottom: 24 },
  icon: { fontSize: 52, marginTop: 20, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 12, textAlign: 'center', letterSpacing: 1 },
  mobileTitle: { marginTop: 0 },
  description: { fontSize: 15, color: '#aaa', lineHeight: 22, textAlign: 'center', marginBottom: 24, maxWidth: 720 },
  section: { width: '100%', maxWidth: 720, backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 18, marginBottom: 14 },
  sectionTitle: { color: '#FFF', fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  sectionText: { color: '#aaa', fontSize: 14, lineHeight: 21 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
