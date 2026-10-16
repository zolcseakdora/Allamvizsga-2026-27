import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

type GalleryImage = {
  image: string;
  uploadedBy?: string;
};

type GalleryImageScreenProps = {
  image: GalleryImage;
  onBack: () => void;
  onDownloadImage: (image: string) => void;
};

export function GalleryImageScreen({ image, onBack, onDownloadImage }: GalleryImageScreenProps) {
  const { t } = useTranslation();

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={styles.webWrapper}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t('galleryImage.back')}</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.fullScreenImageFrame}>
            <Image source={{ uri: image.image }} style={StyleSheet.absoluteFill} resizeMode="contain" />
          </View>
          <Text style={styles.author}>{t('galleryImage.uploadedBy', { name: image.uploadedBy })}</Text>
          <TouchableOpacity style={styles.downloadButton} onPress={() => onDownloadImage(image.image)}>
            <Text style={styles.downloadButtonText}>📥 {t('common.download')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 1200, flex: 1, padding: 24, alignSelf: 'flex-start' },
  backButton: { marginBottom: 15 },
  backButtonText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  scrollContent: { alignItems: 'center', paddingBottom: 20 },
  fullScreenImageFrame: { width: '100%', aspectRatio: 16 / 9, borderRadius: 10, overflow: 'hidden' },
  author: { color: '#aaa', marginTop: 10, fontSize: 13 },
  downloadButton: { width: '100%', marginTop: 20, backgroundColor: '#EC2127', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  downloadButtonText: { color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
});