import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ImageAspectFrame } from '@/src/components/image-aspect-frame';
import { GALLERY_FOLDERS } from '@/src/constants/gallery';

type GalleryImage = {
  id: string;
  image: string;
  uploadedBy?: string;
};

type GalleryScreenProps = {
  selectedFolder: string | null;
  images: GalleryImage[];
  onBack: () => void;
  onRefresh: (folder: string) => void;
  onSelectFolder: (folder: string) => void;
  onUploadImage: (folder: string) => void;
  onSelectImage: (image: GalleryImage) => void;
};

export function GalleryScreen({
  selectedFolder,
  images,
  onBack,
  onRefresh,
  onSelectFolder,
  onUploadImage,
  onSelectImage,
}: GalleryScreenProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const selectedFolderName = GALLERY_FOLDERS.find(folder => folder.id === selectedFolder);
  const folderLabel = selectedFolderName ? t(selectedFolderName.nameKey) : selectedFolder ?? '';

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={[styles.webWrapper, width < 900 && styles.mobileWebWrapper]}>
        <View style={styles.headerRow}>
          {selectedFolder && (
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.backButtonText}>← {t('common.back')}</Text>
            </TouchableOpacity>
          )}
          {selectedFolder && (
            <TouchableOpacity onPress={() => onRefresh(selectedFolder)}>
              <Text style={styles.refreshButtonText}>🔄 {t('common.refresh')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.title, width < 900 && styles.mobileTitle]}>
          {selectedFolder ? `📁 ${folderLabel}` : `📸 ${t('gallery.title')}`}
        </Text>
        <Text style={styles.subtitle}>
          {selectedFolder ? t('gallery.imageInstruction') : t('gallery.chooseFolder')}
        </Text>

        {!selectedFolder ? (
          <ScrollView
            style={styles.folderList}
            contentContainerStyle={styles.galleryListContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.folderGrid}>
              {GALLERY_FOLDERS.map(folder => (
                <TouchableOpacity key={folder.id} style={styles.folderCard} onPress={() => onSelectFolder(folder.id)}>
                  <Text style={styles.folderIcon}>{folder.icon}</Text>
                  <Text style={styles.folderName}>{t(folder.nameKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <>
            <TouchableOpacity style={styles.uploadButton} onPress={() => onUploadImage(selectedFolder)}>
              <Text style={styles.uploadButtonText}>+ {t('gallery.uploadHere', { folder: folderLabel })}</Text>
            </TouchableOpacity>
            <ScrollView
              style={styles.imageList}
              contentContainerStyle={styles.galleryListContent}
              showsVerticalScrollIndicator={false}
            >
              {images.length === 0 ? (
                <Text style={styles.emptyState}>{t('gallery.empty')}</Text>
              ) : (
                images.map(image => (
                  <TouchableOpacity key={image.id} style={styles.galleryCard} onPress={() => onSelectImage(image)}>
                    <ImageAspectFrame source={{ uri: image.image }} style={styles.galleryImageFrame} />
                    <Text style={styles.galleryAuthor}>{t('gallery.uploadedBy', { name: image.uploadedBy })}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 1200, flex: 1, padding: 24, alignSelf: 'flex-start' },
  mobileWebWrapper: { paddingTop: 12, paddingHorizontal: 12, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  backButtonText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  refreshButtonText: { color: '#27AE60', fontSize: 15, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center', letterSpacing: 1, marginTop: 15 },
  mobileTitle: { marginTop: 0 },
  subtitle: { fontSize: 13, color: '#aaa', marginBottom: 20, textAlign: 'center' },
  folderList: { flex: 1, width: '100%', marginTop: 10 },
  galleryListContent: { paddingBottom: 16 },
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  folderCard: { width: '48%', backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 15 },
  folderIcon: { fontSize: 36, marginBottom: 8 },
  folderName: { color: '#FFF', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  uploadButton: { marginBottom: 15, backgroundColor: '#EC2127', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  uploadButtonText: { color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
  imageList: { flex: 1, width: '100%' },
  emptyState: { textAlign: 'center', marginTop: 30, color: '#888' },
  galleryCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, marginBottom: 15, overflow: 'hidden', paddingBottom: 10 },
  galleryImageFrame: { borderRadius: 10 },
  galleryAuthor: { color: '#aaa', fontSize: 12, paddingHorizontal: 12, marginTop: 8 },
});