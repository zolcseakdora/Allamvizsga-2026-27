import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type VerificationPendingScreenProps = {
  hasIgazolas: boolean;
  onUploadIgazolas: () => void;
  onLogout: () => void;
};

export function VerificationPendingScreen({ hasIgazolas, onUploadIgazolas, onLogout }: VerificationPendingScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.card}>
          <Text style={styles.title}>⏳ FÜGGŐBEN LÉVŐ REGISZTRÁCIÓ</Text>
          <Text style={styles.cardText}>
            A fiókod és a diákigazolványod ellenőrzés alatt áll. Kérjük, várd meg, amíg egy főszervező jóváhagyja a regisztrációdat!
          </Text>

          {!hasIgazolas ? (
            <TouchableOpacity style={styles.solidButton} onPress={onUploadIgazolas}>
              <Text style={styles.solidButtonText}>📸 Diákigazolvány Feltöltése</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.uploadedText}>✅ Igazolvány feltöltve. Visszaigazolásra vár.</Text>
          )}

          <TouchableOpacity style={styles.outlineButton} onPress={onLogout}>
            <Text style={styles.outlineButtonText}>Kilépés</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 450, flex: 1, padding: 20, justifyContent: 'center' },
  card: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#F39C12', marginBottom: 6, textAlign: 'center', letterSpacing: 1 },
  cardText: { fontSize: 14, color: '#aaa', lineHeight: 20, textAlign: 'center', marginVertical: 15 },
  solidButton: { backgroundColor: '#EC2127', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  solidButtonText: { color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
  uploadedText: { color: '#27AE60', textAlign: 'center', fontWeight: 'bold', marginBottom: 15 },
  outlineButton: { borderWidth: 2, borderColor: '#EC2127', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center', marginBottom: 14, backgroundColor: '#1E1E1E', marginTop: 10 },
  outlineButtonText: { color: '#FFF', fontWeight: 'bold' },
});