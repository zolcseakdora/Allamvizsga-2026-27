import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ProfileScreenProps = {
  name: string;
  email?: string | null;
  team: string;
  role: string;
  profileImage: string | null;
  hasIgazolas: boolean;
  isVerified: boolean;
  onBack: () => void;
  onUploadProfileImage: () => void;
};

export function ProfileScreen({
  name,
  email,
  team,
  role,
  profileImage,
  hasIgazolas,
  isVerified,
  onBack,
  onUploadProfileImage,
}: ProfileScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Vissza a Főoldalra</Text>
        </TouchableOpacity>
        <Text style={styles.title}>👤 SAJÁT PROFIL</Text>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity onPress={onUploadProfileImage} style={styles.avatarContainer}>
            {profileImage ? <Image source={{ uri: profileImage }} style={styles.avatar} /> : <Text style={styles.avatarPlaceholder}>📷</Text>}
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Kattints a képre a módosításhoz</Text>
          <View style={styles.profileInfoCard}>
            <Text style={styles.profileLabel}>Név:</Text>
            <Text style={styles.profileValue}>{name || 'Nincs megadva'}</Text>
            <Text style={styles.profileLabel}>E-mail:</Text>
            <Text style={styles.profileValue}>{email}</Text>
            <Text style={styles.profileLabel}>Csapat:</Text>
            <Text style={styles.profileValue}>{team || 'Egyéni'}</Text>
            <Text style={styles.profileLabel}>Szerepkör:</Text>
            <Text style={[styles.profileValue, styles.roleValue]}>{role}</Text>

            <Text style={styles.profileLabel}>Diákigazolvány:</Text>
            <Text style={[styles.verificationStatus, { color: hasIgazolas ? (isVerified ? '#27AE60' : '#F39C12') : '#EC2127' }]}>
              {hasIgazolas ? (isVerified ? '✅ Elfogadva' : '⏳ Ellenőrzés alatt') : '❌ Nincs feltöltve'}
            </Text>
          </View>
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
  roleValue: { color: '#EC2127' },
  verificationStatus: { fontWeight: 'bold' },
});