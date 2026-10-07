import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t('galleryImage.back')}</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Image source={{ uri: image.image }} style={styles.fullScreenImage} resizeMode="contain" />
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
  webWrapper: { width: '100%', maxWidth: 450, flex: 1, padding: 20, justifyContent: 'center' },
  backButton: { marginBottom: 15 },
  backButtonText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  scrollContent: { alignItems: 'center', paddingBottom: 20 },
  fullScreenImage: { width: '100%', height: 350, borderRadius: 10 },
  author: { color: '#aaa', marginTop: 10, fontSize: 13 },
  downloadButton: { width: '100%', marginTop: 20, backgroundColor: '#EC2127', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  downloadButtonText: { color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
});