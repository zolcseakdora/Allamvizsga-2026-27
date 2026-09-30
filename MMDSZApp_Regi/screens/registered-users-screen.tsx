import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type RegisteredUser = {
  id: string;
  name?: string;
  role?: string;
  igazolas?: string;
};

type RegisteredUsersScreenProps = {
  users: RegisteredUser[];
  onBack: () => void;
  onRefresh: () => void;
};

export function RegisteredUsersScreen({ users, onBack, onRefresh }: RegisteredUsersScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← Vissza</Text></TouchableOpacity>
          <TouchableOpacity onPress={onRefresh}><Text style={styles.refreshText}>🔄 Frissítés</Text></TouchableOpacity>
        </View>
        <Text style={styles.title}>👥 REGISZTRÁLTAK</Text>
        <ScrollView style={styles.list}>
          {users.map(user => (
            <View key={user.id} style={styles.userCard}>
              <Text style={styles.userName}>👤 {user.name}</Text>
              <Text style={styles.userRole}>Szerepkör: {user.role}</Text>
              <Text style={[styles.verification, { color: user.igazolas ? '#27AE60' : '#EC2127' }]}>
                {user.igazolas ? '✅ Igazolás feltöltve' : '❌ Nincs igazolás'}
              </Text>
            </View>
          ))}
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center', letterSpacing: 1, marginTop: 15 },
  list: { width: '100%', marginTop: 10 },
  userCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 14, marginBottom: 10 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  userRole: { fontSize: 14, color: '#aaa' },
  verification: { marginTop: 4, fontWeight: 'bold' },
});