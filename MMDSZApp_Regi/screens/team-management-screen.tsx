import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FilterChip } from '@/components/filter-chip';

type TeamManagementScreenProps = {
  teamName: string;
  teamDescription: string;
  teamVideoLink: string;
  teamLogo: string | null;
  teamFlag: string | null;
  inviteEmail: string;
  inviteRole: 'Csapattag' | 'Alcsapatkapitány';
  onBack: () => void;
  onRefresh: () => void;
  onDescriptionChange: (value: string) => void;
  onVideoLinkChange: (value: string) => void;
  onUploadTeamImage: (type: 'logo' | 'flag') => void;
  onSaveTeamData: () => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (role: 'Csapattag' | 'Alcsapatkapitány') => void;
  onSendTeamInvite: () => void;
};

export function TeamManagementScreen({
  teamName,
  teamDescription,
  teamVideoLink,
  teamLogo,
  teamFlag,
  inviteEmail,
  inviteRole,
  onBack,
  onRefresh,
  onDescriptionChange,
  onVideoLinkChange,
  onUploadTeamImage,
  onSaveTeamData,
  onInviteEmailChange,
  onInviteRoleChange,
  onSendTeamInvite,
}: TeamManagementScreenProps) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← {t('common.back')}</Text></TouchableOpacity>
          <TouchableOpacity onPress={onRefresh}><Text style={styles.refreshText}>🔄 {t('common.refresh')}</Text></TouchableOpacity>
        </View>
        <Text style={styles.title}>🛡️ {teamName ? t('teamManagement.title', { teamName: teamName.toUpperCase() }) : t('teamManagement.fallbackTitle')}</Text>
        <Text style={styles.subtitle}>{t('teamManagement.subtitle')}</Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.imageRow}>
            <View style={styles.imageColumn}>
              <Text style={styles.cardTitle}>{t('teamManagement.logo')}</Text>
              <TouchableOpacity onPress={() => onUploadTeamImage('logo')} style={styles.logoPlaceholder}>
                {teamLogo ? <Image source={{ uri: teamLogo }} style={styles.teamLogo} /> : <Text style={styles.placeholderText}>📷</Text>}
              </TouchableOpacity>
            </View>
            <View style={styles.imageColumn}>
              <Text style={styles.cardTitle}>{t('teamManagement.flag')}</Text>
              <TouchableOpacity onPress={() => onUploadTeamImage('flag')} style={styles.flagPlaceholder}>
                {teamFlag ? <Image source={{ uri: teamFlag }} style={styles.teamFlag} /> : <Text style={styles.placeholderText}>🚩</Text>}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('teamManagement.description')}</Text>
            <TextInput style={styles.descriptionInput} placeholder={t('teamManagement.descriptionPlaceholder')} placeholderTextColor="#888" multiline value={teamDescription} onChangeText={onDescriptionChange} />
            <Text style={styles.videoLabel}>{t('teamManagement.videoLink')}</Text>
            <TextInput style={styles.input} placeholder="https://..." placeholderTextColor="#888" value={teamVideoLink} onChangeText={onVideoLinkChange} />
            <TouchableOpacity style={styles.solidButton} onPress={onSaveTeamData}><Text style={styles.solidButtonText}>{t('common.save')}</Text></TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>✉️ {t('teamManagement.inviteTitle')}</Text>
            <Text style={styles.cardText}>{t('teamManagement.inviteDescription')}</Text>
            <TextInput
              style={styles.inviteInput}
              placeholder="tag@email.com"
              placeholderTextColor="#888"
              keyboardType="email-address"
              value={inviteEmail}
              onChangeText={onInviteEmailChange}
              autoCapitalize="none"
            />
            <Text style={styles.profileLabel}>{t('teamManagement.chooseRole')}</Text>
            <View style={styles.roleRow}>
              <FilterChip label={t('roles.member')} selected={inviteRole === 'Csapattag'} onPress={() => onInviteRoleChange('Csapattag')} style={styles.roleChip} />
              <FilterChip label={t('roles.deputy')} selected={inviteRole === 'Alcsapatkapitány'} onPress={() => onInviteRoleChange('Alcsapatkapitány')} style={styles.roleChip} />
            </View>
            <TouchableOpacity style={styles.inviteButton} onPress={onSendTeamInvite}>
              <Text style={styles.solidButtonText}>{t('teamManagement.invite')}</Text>
            </TouchableOpacity>
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
  scroll: { width: '100%' },
  imageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  imageColumn: { alignItems: 'center', width: '48%' },
  logoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1E1E1E', borderWidth: 2, borderColor: '#333', justifyContent: 'center', alignItems: 'center', marginTop: 10, overflow: 'hidden' },
  flagPlaceholder: { width: 120, height: 80, backgroundColor: '#1E1E1E', borderWidth: 2, borderColor: '#333', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10, overflow: 'hidden' },
  teamLogo: { width: '100%', height: '100%', borderRadius: 50 },
  teamFlag: { width: '100%', height: '100%', borderRadius: 8 },
  placeholderText: { color: '#aaa', fontSize: 24 },
  card: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  cardText: { fontSize: 14, color: '#aaa', lineHeight: 20 },
  descriptionInput: { height: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#1E1E1E', color: '#FFF' },
  videoLabel: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#1E1E1E', color: '#FFF' },
  inviteInput: { borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#1E1E1E', color: '#FFF', marginTop: 8 },
  profileLabel: { fontSize: 12, color: '#aaa', marginTop: 8, marginBottom: 6 },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  roleChip: { flex: 1 },
  solidButton: { backgroundColor: '#EC2127', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  inviteButton: { backgroundColor: '#27AE60', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  solidButtonText: { color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
});