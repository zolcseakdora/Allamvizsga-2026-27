import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FilterChip } from '@/src/components/controls/filter-chip';
import { UserRole } from '@/src/types/auth';

export type OrganizerInviteRole =
  | UserRole.SZERVEZO
  | UserRole.CSAPATKAPITANY
  | UserRole.ALCSAPATKAPITANY;

type InviteManagementScreenProps = {
  teams: string[];
  teamName: string;
  email: string;
  role: OrganizerInviteRole;
  onBack: () => void;
  onTeamChange: (team: string) => void;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: OrganizerInviteRole) => void;
  onSendInvite: () => void;
};

export function InviteManagementScreen({
  teams,
  teamName,
  email,
  role,
  onBack,
  onTeamChange,
  onEmailChange,
  onRoleChange,
  onSendInvite,
}: InviteManagementScreenProps) {
  const { t } = useTranslation();
  const inviteRoles: OrganizerInviteRole[] = [
    UserRole.SZERVEZO,
    UserRole.CSAPATKAPITANY,
    UserRole.ALCSAPATKAPITANY,
  ];

  const roleLabel = (inviteRole: OrganizerInviteRole): string => {
    switch (inviteRole) {
      case UserRole.SZERVEZO:
        return t('roles.organizer');
      case UserRole.CSAPATKAPITANY:
        return t('roles.captain');
      case UserRole.ALCSAPATKAPITANY:
        return t('roles.deputy');
      default:
        return inviteRole;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>✉️ {t('inviteManagement.title')}</Text>
        <Text style={styles.description}>{t('inviteManagement.description')}</Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.label}>{t('common.team')}</Text>
            {teams.length === 0 ? (
              <Text style={styles.emptyText}>{t('inviteManagement.noTeams')}</Text>
            ) : (
              <View style={styles.chipRow}>
                {teams.map((team) => (
                  <FilterChip
                    key={team}
                    label={team}
                    selected={teamName === team}
                    onPress={() => onTeamChange(team)}
                    style={styles.chip}
                  />
                ))}
              </View>
            )}

            <Text style={styles.label}>{t('common.email')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('inviteManagement.emailPlaceholder')}
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={onEmailChange}
            />

            <Text style={styles.label}>{t('common.role')}</Text>
            <View style={styles.chipRow}>
              {inviteRoles.map((inviteRole) => (
                <FilterChip
                  key={inviteRole}
                  label={roleLabel(inviteRole)}
                  selected={role === inviteRole}
                  onPress={() => onRoleChange(inviteRole)}
                  style={styles.chip}
                />
              ))}
            </View>
            <TouchableOpacity
              style={[styles.button, teams.length === 0 && styles.disabledButton]}
              onPress={onSendInvite}
              disabled={teams.length === 0}
            >
              <Text style={styles.buttonText}>{t('inviteManagement.send')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 450, flex: 1, padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  backText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#EC2127', marginVertical: 15, textAlign: 'center' },
  description: { fontSize: 14, color: '#aaa', lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  scroll: { width: '100%' },
  card: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16 },
  label: { fontSize: 13, color: '#aaa', marginBottom: 8, marginTop: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  chip: { marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 8, backgroundColor: '#121212', color: '#FFF' },
  emptyText: { color: '#aaa', marginBottom: 8 },
  button: { backgroundColor: '#27AE60', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  disabledButton: { opacity: 0.5 },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
});
