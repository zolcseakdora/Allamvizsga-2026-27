import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { FilterChip } from '@/src/components/controls/filter-chip';
import { UserRole } from '@/src/types/auth';

export type OrganizerInviteRole = UserRole.SZERVEZO | UserRole.ZSURI;

type InviteManagementScreenProps = {
  email: string;
  role: OrganizerInviteRole;
  isSending: boolean;
  onBack: () => void;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: OrganizerInviteRole) => void;
  onSendInvite: () => void;
};

export function InviteManagementScreen({
  email, role, isSending, onBack, onEmailChange, onRoleChange, onSendInvite,
}: InviteManagementScreenProps) {
  const { t } = useTranslation();
  const options: OrganizerInviteRole[] = [UserRole.SZERVEZO, UserRole.ZSURI];
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={styles.wrapper}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>✉️ {t('inviteManagement.title')}</Text>
        <Text style={styles.description}>{t('inviteManagement.description')}</Text>
        <ScrollView contentContainerStyle={styles.card}>
          <Text style={styles.label}>{t('common.email')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('inviteManagement.emailPlaceholder')}
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={onEmailChange}
          />
          <Text style={styles.label}>{t('common.role')}</Text>
          <View style={styles.roles}>
            {options.map((option) => (
              <FilterChip
                key={option}
                label={t(option === UserRole.SZERVEZO ? 'roles.organizer' : 'roles.jury')}
                selected={role === option}
                onPress={() => onRoleChange(option)}
                style={styles.roleChip}
              />
            ))}
          </View>
          <TouchableOpacity style={[styles.button, isSending && styles.disabled]} disabled={isSending} onPress={onSendInvite}>
            <Text style={styles.buttonText}>
              {isSending ? t('inviteManagement.sending') : t('inviteManagement.send')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  wrapper: { width: '100%', maxWidth: 800, alignSelf: 'center', padding: 24, flex: 1 },
  backButton: { marginBottom: 10 },
  backText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#EC2127', textAlign: 'center', marginBottom: 12 },
  description: { color: '#aaa', textAlign: 'center', marginBottom: 16 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 10, borderWidth: 1, borderColor: '#333', padding: 16 },
  label: { color: '#aaa', marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: '#121212', color: '#fff', borderColor: '#333', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  roleChip: { marginRight: 10, marginBottom: 8 },
  button: { backgroundColor: '#27AE60', borderRadius: 8, padding: 14, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
