import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserRole } from '@/src/types/auth';

type ProfileScreenProps = {
  name: string;
  email?: string | null;
  team: string;
  role: UserRole;
  profileImage: string | null;
  hasIgazolas: boolean;
  isVerified: boolean;
  canManageAdmin: boolean;
  onBack: () => void;
  onUploadProfileImage: () => void;
  onSaveName: (name: string) => void;
  onOpenAdmin: () => void;
};

export function ProfileScreen({
  name,
  email,
  team,
  role,
  profileImage,
  hasIgazolas,
  isVerified,
  canManageAdmin,
  onBack,
  onUploadProfileImage,
  onSaveName,
  onOpenAdmin,
}: ProfileScreenProps) {
  const { t } = useTranslation();
  const [editedName, setEditedName] = useState(name);

  const translatedRole = role === 'Főszervező'
    ? t('roles.headOrganizer')
    : role === UserRole.SZERVEZO
      ? t('roles.organizer')
      : role === UserRole.CSAPATKAPITANY
        ? t('roles.captain')
        : role === UserRole.ALCSAPATKAPITANY
          ? t('roles.deputy')
          : role === UserRole.CSAPATTAG
            ? t('roles.member')
            : role;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t('profile.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>👤 {t('profile.title')}</Text>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity onPress={onUploadProfileImage} style={styles.avatarContainer}>
            {profileImage ? <Image source={{ uri: profileImage }} style={styles.avatar} /> : <Text style={styles.avatarPlaceholder}>📷</Text>}
          </TouchableOpacity>
          <Text style={styles.avatarHint}>{t('profile.editPhoto')}</Text>
          <View style={styles.profileInfoCard}>
            <Text style={styles.profileLabel}>{t('profile.name')}:</Text>
            <TextInput
              style={styles.nameInput}
              value={editedName}
              onChangeText={setEditedName}
              placeholder={t('profile.noName')}
              placeholderTextColor="#888"
              accessibilityLabel={t('profile.name')}
            />
            <TouchableOpacity style={styles.saveNameButton} onPress={() => onSaveName(editedName)}>
              <Text style={styles.saveNameText}>{t('profile.saveName')}</Text>
            </TouchableOpacity>
            <Text style={styles.profileLabel}>{t('common.email')}:</Text>
            <Text style={styles.profileValue}>{email}</Text>
            <Text style={styles.profileLabel}>{t('common.team')}:</Text>
            <Text style={styles.profileValue}>{team || t('profile.individualTeam')}</Text>
            <Text style={styles.profileLabel}>{t('common.role')}:</Text>
            <Text style={[styles.profileValue, styles.roleValue]}>{translatedRole}</Text>

            <Text style={styles.profileLabel}>{t('profile.studentId')}:</Text>
            <Text style={[styles.verificationStatus, { color: hasIgazolas ? (isVerified ? '#27AE60' : '#F39C12') : '#EC2127' }]}>
              {hasIgazolas ? (isVerified ? `✅ ${t('verification.accepted')}` : `⏳ ${t('verification.pending')}`) : `❌ ${t('verification.missing')}`}
            </Text>
          </View>
          {canManageAdmin && (
            <TouchableOpacity style={styles.adminButton} onPress={onOpenAdmin}>
              <Text style={styles.adminButtonText}>⚙️ {t('profile.adminPanel')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 450, flex: 1, padding: 20, justifyContent: 'center' },
  backButton: { marginBottom: 15 },
  backButtonText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center', letterSpacing: 1 },
  scrollContent: { alignItems: 'center', paddingVertical: 10 },
  avatarContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#EC2127', overflow: 'hidden', marginBottom: 5 },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { fontSize: 35 },
  avatarHint: { fontSize: 12, color: '#aaa', marginBottom: 15 },
  profileInfoCard: { width: '100%', backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginTop: 10 },
  profileLabel: { fontSize: 12, color: '#aaa', marginTop: 8 },
  profileValue: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  nameInput: { borderWidth: 1, borderColor: '#444', borderRadius: 8, padding: 10, color: '#FFF', marginTop: 4 },
  saveNameButton: { alignSelf: 'flex-start', backgroundColor: '#EC2127', borderRadius: 7, paddingHorizontal: 14, paddingVertical: 9, marginTop: 8 },
  saveNameText: { color: '#FFF', fontWeight: 'bold' },
  roleValue: { color: '#EC2127' },
  verificationStatus: { fontWeight: 'bold' },
  adminButton: { width: '100%', backgroundColor: '#EC2127', padding: 14, borderRadius: 8, marginTop: 18, alignItems: 'center' },
  adminButtonText: { color: '#FFF', fontWeight: 'bold' },
});