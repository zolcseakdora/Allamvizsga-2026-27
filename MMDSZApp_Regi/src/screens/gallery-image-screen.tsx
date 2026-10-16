import { useEffect, useRef } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/src/constants/theme';
import type { GalleryImage } from '@/src/types/gallery';

type GalleryImageScreenProps = {
  image: GalleryImage | null;
  isLoading: boolean;
  error: string | null;
  canManageGallery: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onBack: () => void;
  onRetry: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDownloadImage: (image: string) => void;
  onDeleteImage: () => void;
};

export function GalleryImageScreen({
  image,
  isLoading,
  error,
  canManageGallery,
  hasPrevious,
  hasNext,
  onBack,
  onRetry,
  onPrevious,
  onNext,
  onDownloadImage,
  onDeleteImage,
}: GalleryImageScreenProps) {
  const { t, i18n } = useTranslation();
  const { height } = useWindowDimensions();
  const touchStartX = useRef<number | null>(null);
  const backgroundColor = Colors.dark.background;

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && hasPrevious) onPrevious();
      if (event.key === 'ArrowRight' && hasNext) onNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNext, hasPrevious, onNext, onPrevious]);

  if (isLoading || error || !image) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['left', 'right']}>
        <View style={styles.statusContent}>
          {isLoading ? (
            <>
              <ActivityIndicator size="large" color="#EC2127" />
              <Text style={styles.statusText}>{t('common.loading')}</Text>
            </>
          ) : error ? (
            <>
              <Text style={styles.statusTitle}>{t('galleryImage.loadError')}</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.backStatusButton} onPress={onRetry} accessibilityRole="button">
                <Text style={styles.backStatusButtonText}>{t('galleryImage.retry')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.statusTitle}>{t('galleryImage.notFound')}</Text>
          )}
          {!isLoading && (
            <TouchableOpacity style={styles.backStatusButton} onPress={onBack} accessibilityRole="button">
              <Text style={styles.backStatusButtonText}>← {t('galleryImage.back')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const date = image.createdAt?.toLocaleDateString(i18n.language === 'hu' ? 'hu-HU' : 'en-US');

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.container, { backgroundColor }]}>
      <View style={[styles.webWrapper, height < 900 && styles.mobileWebWrapper]}>
        <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} accessibilityRole="button">
              <Text style={styles.backButtonText}>← {t('galleryImage.back')}</Text>
            </TouchableOpacity>
            {canManageGallery && (
              <TouchableOpacity onPress={onDeleteImage} accessibilityRole="button">
                <Text style={styles.deleteButtonText}>{t('galleryImage.delete')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <View
            style={[styles.imageFrame, { height: Math.min(height * 0.72, 760) }]}
            onTouchStart={event => {
              touchStartX.current = event.nativeEvent.pageX;
            }}
            onTouchEnd={event => {
              if (touchStartX.current === null) return;
              const distance = event.nativeEvent.pageX - touchStartX.current;
              touchStartX.current = null;
              if (distance > 60 && hasPrevious) onPrevious();
              if (distance < -60 && hasNext) onNext();
            }}
          >
            <Image source={{ uri: image.image }} style={styles.fullScreenImage} resizeMode="contain" />
          </View>
          <View style={styles.navigationRow}>
            <TouchableOpacity
              style={[styles.navigationButton, !hasPrevious && styles.disabledButton]}
              onPress={onPrevious}
              disabled={!hasPrevious}
              accessibilityRole="button"
              accessibilityLabel={t('galleryImage.previous')}
            >
              <Text style={styles.navigationButtonText}>← {t('galleryImage.previous')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navigationButton, !hasNext && styles.disabledButton]}
              onPress={onNext}
              disabled={!hasNext}
              accessibilityRole="button"
              accessibilityLabel={t('galleryImage.next')}
            >
              <Text style={styles.navigationButtonText}>{t('galleryImage.next')} →</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.author}>{t('galleryImage.uploadedBy', { name: image.uploadedBy || t('gallery.unknownUploader') })}</Text>
          {date ? <Text style={styles.date}>{date}</Text> : null}
          <TouchableOpacity style={styles.downloadButton} onPress={() => onDownloadImage(image.image)} accessibilityRole="button">
            <Text style={styles.downloadButtonText}>📥 {t('common.download')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  statusContent: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  statusText: { color: '#ddd', fontSize: 15 },
  statusTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  errorText: { color: '#ffb4b4', fontSize: 14, textAlign: 'center' },
  backStatusButton: { marginTop: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, backgroundColor: '#292929' },
  backStatusButtonText: { color: '#FFF', fontWeight: 'bold' },
  webWrapper: { width: '100%', maxWidth: 1200, flex: 1, padding: 24, alignSelf: 'flex-start', alignItems: 'center' },
  mobileWebWrapper: { paddingTop: 12, paddingHorizontal: 12, paddingBottom: 8 },
  detailScroll: { width: '100%' },
  detailContent: { alignItems: 'center', paddingBottom: 12 },
  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  backButtonText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  deleteButtonText: { color: '#ff7777', fontSize: 15, fontWeight: 'bold' },
  imageFrame: { width: '100%', maxHeight: '80%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#080808' },
  fullScreenImage: { width: '100%', height: '100%' },
  navigationRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  navigationButton: { backgroundColor: '#242424', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  disabledButton: { opacity: 0.4 },
  navigationButtonText: { color: '#FFF', fontWeight: 'bold' },
  author: { color: '#ddd', marginTop: 12, fontSize: 14 },
  date: { color: '#999', marginTop: 4, fontSize: 12 },
  downloadButton: { minWidth: 180, marginTop: 14, backgroundColor: '#EC2127', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center' },
  downloadButtonText: { color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
});
