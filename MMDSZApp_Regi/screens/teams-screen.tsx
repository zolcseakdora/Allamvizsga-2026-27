import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type TeamSummary = {
  name?: string;
  logo?: string;
  description?: string;
  videoLink?: string;
};

type TeamsScreenProps = {
  teams: TeamSummary[];
  onBack: () => void;
  onRefresh: () => void;
  onOpenVideo: (videoLink?: string) => void;
};

export function TeamsScreen({ teams, onBack, onRefresh, onOpenVideo }: TeamsScreenProps) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← {t('common.back')}</Text></TouchableOpacity>
          <TouchableOpacity onPress={onRefresh}><Text style={styles.refreshText}>🔄 {t('common.refresh')}</Text></TouchableOpacity>
        </View>
        <Text style={styles.title}>🛡️ {t('teams.title')}</Text>
        <Text style={styles.subtitle}>{t('teams.instruction')}</Text>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {teams.length === 0 ? (
              <Text style={styles.emptyState}>{t('teams.empty')}</Text>
            ) : (
              teams.map((team, index) => (
                <View key={index} style={styles.teamCard}>
                  <View style={styles.logoWithBubbles}>
                    <TouchableOpacity style={styles.teamLogoCircle} onPress={() => onOpenVideo(team.videoLink)}>
                      {team.logo ? <Image source={{ uri: team.logo }} style={styles.teamLogoImage} /> : <Text style={styles.teamPlaceholder}>⛺</Text>}
                    </TouchableOpacity>
                    <View style={[styles.sponsorBubble, styles.bubbleTopLeft]}><Text style={styles.bubbleText}>⭐</Text></View>
                    <View style={[styles.sponsorBubble, styles.bubbleTopRight]}><Text style={styles.bubbleText}>💸</Text></View>
                    <View style={[styles.sponsorBubble, styles.bubbleBottomLeft]}><Text style={styles.bubbleText}>⚡</Text></View>
                  </View>
                  <Text style={styles.teamName}>{team.name || t('teams.unnamed')}</Text>
                  <Text style={styles.teamDescription} numberOfLines={2}>{team.description || t('common.noDescription')}</Text>
                </View>
              ))
            )}
          </View>
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#EC2127', marginBottom: 6, textAlign: 'center', letterSpacing: 1, marginTop: 15 },
  subtitle: { fontSize: 13, color: '#aaa', marginBottom: 20, textAlign: 'center' },
  list: { width: '100%', marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  emptyState: { textAlign: 'center', width: '100%', color: '#888', marginTop: 20 },
  teamCard: { width: '48%', backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 15 },
  logoWithBubbles: { position: 'relative', width: 80, height: 80, marginBottom: 10 },
  teamLogoCircle: { width: '100%', height: '100%', borderRadius: 40, backgroundColor: '#121212', borderWidth: 2, borderColor: '#EC2127', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  teamLogoImage: { width: '100%', height: '100%' },
  teamPlaceholder: { fontSize: 30 },
  sponsorBubble: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EC2127', elevation: 3 },
  bubbleTopLeft: { top: -5, left: -5 },
  bubbleTopRight: { top: -5, right: -5 },
  bubbleBottomLeft: { bottom: -5, left: -5 },
  bubbleText: { fontSize: 10 },
  teamName: { color: '#FFF', fontWeight: 'bold', fontSize: 14, textAlign: 'center', marginBottom: 4 },
  teamDescription: { color: '#aaa', fontSize: 11, textAlign: 'center' },
});