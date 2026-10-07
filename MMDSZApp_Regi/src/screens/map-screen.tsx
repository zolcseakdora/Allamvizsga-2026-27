import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type MapPoint = {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
};

type MapScreenProps = {
  points: MapPoint[];
  onBack: () => void;
  onRefresh: () => void;
};

export function MapScreen({ points, onBack, onRefresh }: MapScreenProps) {
  const { t } = useTranslation();
  const mapHtml = `<!DOCTYPE html><html><head><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>body { margin: 0; padding: 0; background: #121212; }</style></head><body><div id="map" style="width: 100vw; height: 100vh;"></div><script>var map = L.map('map').setView([46.5435, 24.5772], 15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);var points = ${JSON.stringify(points)};points.forEach(function(p) { L.marker([p.lat, p.lng]).addTo(map).bindPopup('<b>' + p.title + '</b><br>' + p.description); });</script></body></html>`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← {t('common.back')}</Text></TouchableOpacity>
          <TouchableOpacity onPress={onRefresh}><Text style={styles.refreshText}>🔄 {t('common.refresh')}</Text></TouchableOpacity>
        </View>
        <Text style={styles.title}>🗺️ {t('map.title')}</Text>
        <View style={styles.mapCard}>
          {Platform.OS === 'web' ? (
            <iframe width="100%" height="380" style={styles.mapFrame} srcDoc={mapHtml} />
          ) : (
            <ScrollView style={styles.pointList}>
              {points.map((point, index) => (
                <View key={index} style={styles.pointCard}>
                  <Text style={styles.pointTitle}>📍 {point.title}</Text>
                  <Text style={styles.pointDescription}>{point.description}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center', letterSpacing: 1, marginTop: 10 },
  mapCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, overflow: 'hidden' },
  mapFrame: { borderWidth: 0, borderRadius: 10 },
  pointList: { padding: 15, maxHeight: 380 },
  pointCard: { marginBottom: 12, padding: 10, backgroundColor: '#1E1E1E', borderRadius: 8 },
  pointTitle: { fontWeight: 'bold', color: '#EC2127' },
  pointDescription: { fontSize: 13, color: '#ccc' },
});