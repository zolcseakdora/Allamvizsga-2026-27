import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { Sponsor } from '@/src/types/sponsor';
import type { Team } from '@/src/types/team';
import { normalizeTeamName, teamNameKey } from '@/src/utils/team-name';

type TeamsScreenProps = {
  teams: Team[];
  sponsors: Sponsor[];
  onBack: () => void;
  onRefresh: () => void;
  onOpenLink: (link?: string) => void;
  canManageTeam: boolean;
  isHeadOrganizer: boolean;
  onOpenTeamManagement: () => void;
};

function teamCompleteness(team: Team) {
  return [team.logo, team.description, team.videoLink]
    .filter(value => typeof value === 'string' && value.trim().length > 0)
    .length;
}

export function TeamsScreen({
  teams,
  sponsors,
  onBack,
  onRefresh,
  onOpenLink,
  canManageTeam,
  isHeadOrganizer,
  onOpenTeamManagement,
}: TeamsScreenProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const columns = width >= 1200 ? 6 : width >= 900 ? 5 : width >= 600 ? 4 : 3;
  const uniqueTeams = new Map<string, Team>();
  let duplicateTeamCount = 0;
  teams.forEach(team => {
    const name = normalizeTeamName(team.name ?? '') || normalizeTeamName(team.id);
    const key = teamNameKey(name);
    const existing = uniqueTeams.get(key);
    if (!existing) {
      uniqueTeams.set(key, team);
    } else {
      duplicateTeamCount += 1;
      if (teamCompleteness(team) > teamCompleteness(existing)) uniqueTeams.set(key, team);
    }
  });
  const visibleTeams = [...uniqueTeams.values()];

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={[styles.webWrapper, width < 900 && styles.mobileWebWrapper]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onRefresh}><Text style={styles.refreshText}>🔄 {t('common.refresh')}</Text></TouchableOpacity>
        </View>
        <Text style={[styles.title, width < 900 && styles.mobileTitle]}>🛡️ {t('teams.title')}</Text>
        <Text style={styles.subtitle}>{t('teams.instruction')}</Text>
        {canManageTeam && (
          <TouchableOpacity style={styles.manageButton} onPress={onOpenTeamManagement}>
            <Text style={styles.manageButtonText}>⚙️ {t('teams.manageTeam')}</Text>
          </TouchableOpacity>
        )}
        {isHeadOrganizer && duplicateTeamCount > 0 && (
          <Text style={styles.duplicateWarning}>
            ⚠️ {t('teams.duplicateWarning', { count: duplicateTeamCount })}
          </Text>
        )}

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {visibleTeams.length === 0 ? (
              <Text style={styles.emptyState}>{t('teams.empty')}</Text>
            ) : (
              visibleTeams.map((team) => (
                <View key={team.id} style={[styles.teamItem, { width: `${100 / columns}%` }]}>
                  <TouchableOpacity
                    style={[styles.teamLogoCircle, { backgroundColor: team.logo ? 'transparent' : placeholderColor(normalizeTeamName(team.name ?? '') || team.id) }]}
                    onPress={() => onOpenLink(team.videoLink)}
                    accessibilityRole="button"
                    accessibilityLabel={normalizeTeamName(team.name ?? '') || t('teams.unnamed')}
                  >
                    {team.logo
                      ? <Image source={{ uri: team.logo }} style={styles.teamLogoImage} />
                      : <Text style={styles.teamPlaceholder}>{(normalizeTeamName(team.name ?? '') || '?').charAt(0).toUpperCase()}</Text>}
                  </TouchableOpacity>
                  <Text style={styles.teamName} numberOfLines={2}>{normalizeTeamName(team.name ?? '') || t('teams.unnamed')}</Text>
                </View>
              ))
            )}
          </View>
          {sponsors.length > 0 && (
            <View style={styles.sponsorsSection}>
              <Text style={styles.sponsorsTitle}>{t('teams.sponsors')}</Text>
              <View style={styles.sponsorsGrid}>
                {sponsors.map((sponsor) => (
                  <TouchableOpacity
                    key={sponsor.id}
                    style={styles.sponsorItem}
                    onPress={() => sponsor.link && onOpenLink(sponsor.link)}
                    disabled={!sponsor.link}
                    accessibilityRole={sponsor.link ? 'link' : undefined}
                    accessibilityLabel={sponsor.name}
                  >
                    <Image source={{ uri: sponsor.logo }} style={styles.sponsorLogo} resizeMode="contain" />
                  </TouchableOpacity>
                ))}
              </View>
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#EC2127', marginBottom: 6, textAlign: 'center', letterSpacing: 1, marginTop: 15 },
  mobileTitle: { marginTop: 0 },
  subtitle: { fontSize: 13, color: '#aaa', marginBottom: 20, textAlign: 'center' },
  manageButton: { backgroundColor: '#EC2127', padding: 12, borderRadius: 8, alignItems: 'center' },
  manageButtonText: { color: '#FFF', fontWeight: 'bold' },
  duplicateWarning: { color: '#F39C12', fontSize: 12, textAlign: 'center', marginTop: 8 },
  list: { flex: 1, width: '100%', marginTop: 10 },
  listContent: { paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start' },
  emptyState: { textAlign: 'center', width: '100%', color: '#888', marginTop: 20 },
  teamItem: { alignItems: 'center', paddingHorizontal: 6, marginBottom: 22 },
  teamLogoCircle: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  teamLogoImage: { width: '100%', height: '100%' },
  teamPlaceholder: { color: '#FFF', fontSize: 30, fontWeight: 'bold' },
  teamName: { color: '#FFF', fontWeight: '600', fontSize: 12, textAlign: 'center', marginTop: 8 },
  sponsorsSection: { marginTop: 22 },
  sponsorsTitle: { color: '#FFF', fontSize: 17, fontWeight: 'bold', textAlign: 'center', marginBottom: 14 },
  sponsorsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  sponsorItem: { width: 90, height: 64, alignItems: 'center', justifyContent: 'center', margin: 8 },
  sponsorLogo: { width: 76, height: 54 },
});

function placeholderColor(name: string) {
  const colors = ['#8E44AD', '#2980B9', '#16A085', '#D35400', '#C0392B', '#2C3E50'];
  const hash = [...name].reduce((value, character) => value + character.charCodeAt(0), 0);
  return colors[hash % colors.length];
}