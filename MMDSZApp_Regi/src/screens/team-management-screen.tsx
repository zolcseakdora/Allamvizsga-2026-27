import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { FilterChip } from '@/src/components/controls/filter-chip';

import { UserRole } from '@/src/types/auth';
import type { Sponsor } from '@/src/types/sponsor';

type TeamManagementScreenProps = {
  teamName: string;
  sponsors: Sponsor[];
  teamDescription: string;
  teamVideoLink: string;
  teamLogo: string | null;
  teamFlag: string | null;
  uploadingImage: 'logo' | 'flag' | null;
  inviteEmail: string;
  inviteRole: UserRole.CSAPATTAG | UserRole.ALCSAPATKAPITANY;
  sponsorName: string;
  sponsorLogo?: string;
  editingSponsor: boolean;
  isManagingSponsors: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onDescriptionChange: (value: string) => void;
  onVideoLinkChange: (value: string) => void;
  onUploadTeamImage: (type: 'logo' | 'flag') => void;
  onSaveTeamData: () => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (role: UserRole.CSAPATTAG | UserRole.ALCSAPATKAPITANY) => void;
  onSendTeamInvite: () => void;
  onSponsorNameChange: (value: string) => void;
  onPickSponsorLogo: () => void;
  onSaveSponsor: () => void;
  onCancelSponsorEdit: () => void;
  onEditSponsor: (sponsor: Sponsor) => void;
  onDeleteSponsor: (sponsor: Sponsor) => void;
};

export function TeamManagementScreen({
  teamName,
  sponsors,
  teamDescription,
  teamVideoLink,
  teamLogo,
  teamFlag,
  uploadingImage,
  inviteEmail,
  inviteRole,
  sponsorName,
  sponsorLogo,
  editingSponsor,
  isManagingSponsors,
  onBack,
  onRefresh,
  onDescriptionChange,
  onVideoLinkChange,
  onUploadTeamImage,
  onSaveTeamData,
  onInviteEmailChange,
  onInviteRoleChange,
  onSendTeamInvite,
  onSponsorNameChange,
  onPickSponsorLogo,
  onSaveSponsor,
  onCancelSponsorEdit,
  onEditSponsor,
  onDeleteSponsor,
}: TeamManagementScreenProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.headerRow}>
          {!isDesktop && <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← {t('common.back')}</Text></TouchableOpacity>}
          <TouchableOpacity onPress={onRefresh}><Text style={styles.refreshText}>🔄 {t('common.refresh')}</Text></TouchableOpacity>
        </View>
        <Text style={[styles.title, isDesktop && styles.desktopTitle]}>🛡️ {teamName ? t('teamManagement.title', { teamName: teamName.toUpperCase() }) : t('teamManagement.fallbackTitle')}</Text>
        <Text style={styles.subtitle}>{t('teamManagement.subtitle')}</Text>

        <ScrollView style={styles.scroll} contentContainerStyle={isDesktop ? styles.desktopColumns : undefined} showsVerticalScrollIndicator={false}>
          <View style={[styles.teamColumn, isDesktop && styles.desktopColumn]}>
            <View style={styles.imageRow}>
              <View style={styles.imageColumn}>
                <Text style={styles.cardTitle}>{t('teamManagement.logo')}</Text>
                <TouchableOpacity onPress={() => onUploadTeamImage('logo')} style={styles.logoPlaceholder} disabled={uploadingImage !== null}>
                  {teamLogo ? <Image source={{ uri: teamLogo }} style={styles.teamLogo} /> : <Text style={styles.placeholderText}>📷</Text>}
                </TouchableOpacity>
                {uploadingImage === 'logo' && <Text style={styles.placeholderText}>{t('common.uploading')}</Text>}
              </View>
              <View style={styles.imageColumn}>
                <Text style={styles.cardTitle}>{t('teamManagement.flag')}</Text>
                <TouchableOpacity onPress={() => onUploadTeamImage('flag')} style={styles.flagPlaceholder} disabled={uploadingImage !== null}>
                  {teamFlag ? <Image source={{ uri: teamFlag }} style={styles.teamFlag} /> : <Text style={styles.placeholderText}>🚩</Text>}
                </TouchableOpacity>
                {uploadingImage === 'flag' && <Text style={styles.placeholderText}>{t('common.uploading')}</Text>}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('teamManagement.description')}</Text>
              <TextInput style={styles.descriptionInput} placeholder={t('teamManagement.descriptionPlaceholder')} placeholderTextColor="#888" multiline value={teamDescription} onChangeText={onDescriptionChange} />
              <Text style={styles.videoLabel}>{t('teamManagement.videoLink')}</Text>
              <TextInput style={styles.input} placeholder="https://..." placeholderTextColor="#888" value={teamVideoLink} onChangeText={onVideoLinkChange} />
              <TouchableOpacity style={styles.solidButton} onPress={onSaveTeamData}><Text style={styles.solidButtonText}>{t('common.save')}</Text></TouchableOpacity>
            </View>
          </View>

          <View style={[styles.teamColumn, isDesktop && styles.desktopColumn]}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🤝 {t('teamManagement.sponsors')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('teamManagement.sponsorNamePlaceholder')}
                placeholderTextColor="#888"
                value={sponsorName}
                onChangeText={onSponsorNameChange}
                editable={!isManagingSponsors}
              />
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={onPickSponsorLogo}
                disabled={isManagingSponsors}
              >
                <Text style={styles.outlineButtonText}>
                  {sponsorLogo ? t('teamManagement.changeSponsorLogo') : t('teamManagement.chooseSponsorLogo')}
                </Text>
              </TouchableOpacity>
              {sponsorLogo && (
                <Image source={{ uri: sponsorLogo }} style={styles.sponsorPreview} resizeMode="contain" />
              )}
              <TouchableOpacity
                style={[styles.solidButton, isManagingSponsors && styles.disabledButton]}
                onPress={onSaveSponsor}
                disabled={isManagingSponsors}
              >
                <Text style={styles.solidButtonText}>
                  {isManagingSponsors
                    ? t('common.uploading')
                    : t(editingSponsor ? 'teamManagement.saveSponsor' : 'teamManagement.addSponsor')}
                </Text>
              </TouchableOpacity>
              {editingSponsor && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancelSponsorEdit}
                  disabled={isManagingSponsors}
                >
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              )}
              {sponsors.length === 0 ? (
                <Text style={styles.cardText}>{t('teamManagement.noSponsors')}</Text>
              ) : (
                <View style={styles.sponsorList}>
                  {sponsors.map((sponsor) => (
                    <View key={sponsor.id} style={styles.sponsorRow}>
                      <Image source={{ uri: sponsor.logo }} style={styles.sponsorLogo} resizeMode="contain" />
                      <Text style={styles.sponsorName} numberOfLines={2}>{sponsor.name}</Text>
                      <View style={styles.sponsorActions}>
                        <TouchableOpacity
                          style={styles.sponsorActionButton}
                          onPress={() => onEditSponsor(sponsor)}
                          disabled={isManagingSponsors}
                        >
                          <Text style={styles.sponsorActionText}>{t('teamManagement.editSponsor')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.sponsorActionButton, styles.deleteSponsorButton]}
                          onPress={() => onDeleteSponsor(sponsor)}
                          disabled={isManagingSponsors}
                        >
                          <Text style={styles.sponsorActionText}>{t('teamManagement.deleteSponsor')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
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
                <FilterChip
                  label={t('roles.member')}
                  selected={inviteRole === UserRole.CSAPATTAG}
                  onPress={() => onInviteRoleChange(UserRole.CSAPATTAG)}
                  style={styles.roleChip}
                />
                <FilterChip
                  label={t('roles.deputy')}
                  selected={inviteRole === UserRole.ALCSAPATKAPITANY}
                  onPress={() => onInviteRoleChange(UserRole.ALCSAPATKAPITANY)}
                  style={styles.roleChip}
                />
              </View>
              <TouchableOpacity style={styles.inviteButton} onPress={onSendTeamInvite}>
                <Text style={styles.solidButtonText}>{t('teamManagement.invite')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 1000, flex: 1, padding: 24, alignSelf: 'flex-start' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  backText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  refreshText: { color: '#27AE60', fontSize: 15, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#EC2127', marginBottom: 6, textAlign: 'center', letterSpacing: 1, marginTop: 15 },
  desktopTitle: { textAlign: 'left', fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#aaa', marginBottom: 20, textAlign: 'center' },
  scroll: { width: '100%' },
  desktopColumns: { flexDirection: 'row', alignItems: 'flex-start', gap: 20, paddingBottom: 24 },
  teamColumn: { width: '100%' },
  desktopColumn: { flex: 1, width: undefined, minWidth: 0 },
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
  disabledButton: { opacity: 0.7 },
  inviteButton: { backgroundColor: '#27AE60', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  solidButtonText: { color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
  outlineButton: { borderWidth: 1, borderColor: '#EC2127', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 12 },
  outlineButtonText: { color: '#FFFFFF', fontWeight: '600', textAlign: 'center' },
  cancelButton: { alignItems: 'center', paddingVertical: 12 },
  cancelButtonText: { color: '#aaa', fontWeight: '600' },
  sponsorPreview: { width: 120, height: 80, alignSelf: 'center', marginBottom: 12 },
  sponsorList: { marginTop: 14 },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333', paddingVertical: 10, gap: 10 },
  sponsorLogo: { width: 56, height: 48 },
  sponsorName: { color: '#FFF', flex: 1, fontSize: 14 },
  sponsorActions: { flexDirection: 'row', gap: 6 },
  sponsorActionButton: { backgroundColor: '#333', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 7 },
  deleteSponsorButton: { backgroundColor: '#7A2024' },
  sponsorActionText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});