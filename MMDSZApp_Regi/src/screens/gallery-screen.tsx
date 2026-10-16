import { FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { GALLERY_FOLDERS } from '@/src/constants/gallery';
import type { GalleryImage } from '@/src/types/gallery';

type GalleryScreenProps = {
  selectedFolder: string | null;
  images: GalleryImage[];
  folderCounts: Record<string, number>;
  imageCount: number;
  hasMoreImages: boolean;
  isLoadingMore: boolean;
  isUploading: boolean;
  onBack: () => void;
  onRefresh: (folder: string) => void;
  onSelectFolder: (folder: string) => void;
  onUploadImage: (folder: string) => void;
  onSelectImage: (image: GalleryImage, imageIds: string[]) => void;
  onLoadMore: () => void;
};

export function GalleryScreen({
  selectedFolder,
  images,
  folderCounts,
  imageCount,
  hasMoreImages,
  isLoadingMore,
  isUploading,
  onBack,
  onRefresh,
  onSelectFolder,
  onUploadImage,
  onSelectImage,
  onLoadMore,
}: GalleryScreenProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isPhone = width < 600;
  const isMobileLayout = width < 900;
  const isWebWidth = width >= 900;
  const columns = isPhone ? 3 : isWebWidth ? 5 : 4;
  const horizontalPadding = width < 900 ? 12 : 24;
  const contentWidth = Math.min(width, 1200) - horizontalPadding * 2;
  const imageSize = Math.max(0, (contentWidth - (columns - 1) * 8) / columns);
  const selectedFolderInfo = GALLERY_FOLDERS.find(folder => folder.id === selectedFolder);
  const folderLabel = selectedFolderInfo ? t(selectedFolderInfo.nameKey) : selectedFolder ?? '';
  const folderCardColumns = width < 600 ? 2 : 3;
  const folderCardWidth = `${100 / folderCardColumns - 1.5}%` as `${number}%`;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={[styles.webWrapper, width < 900 && styles.mobileWebWrapper]}>
        <View style={styles.headerRow}>
          {selectedFolder ? (
            <TouchableOpacity onPress={onBack} accessibilityRole="button">
              <Text style={styles.backButtonText}>← {t('common.back')}</Text>
            </TouchableOpacity>
          ) : <View />}
          {selectedFolder ? (
            <TouchableOpacity onPress={() => onRefresh(selectedFolder)} accessibilityRole="button">
              <Text style={styles.refreshButtonText}>🔄 {t('common.refresh')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!selectedFolder ? (
          <>
            <Text style={[styles.title, width < 900 && styles.mobileTitle]}>📸 {t('gallery.title')}</Text>
            <Text style={styles.subtitle}>{t('gallery.chooseFolder')}</Text>
            <ScrollView
              style={styles.folderList}
              contentContainerStyle={styles.folderGrid}
              showsVerticalScrollIndicator={false}
            >
              {GALLERY_FOLDERS.map(folder => (
                <TouchableOpacity
                  key={folder.id}
                  style={[styles.folderCard, { width: folderCardWidth, minWidth: width >= 600 ? 220 : 0 }]}
                  onPress={() => onSelectFolder(folder.id)}
                  accessibilityRole="button"
                >
                  <Text style={styles.folderIcon}>{folder.icon}</Text>
                  <Text style={styles.folderName}>{t(folder.nameKey)}</Text>
                  <Text style={styles.folderCount}>
                    {folder.id in folderCounts
                      ? t('gallery.imageCount', { count: folderCounts[folder.id] })
                      : t('common.loading')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={styles.folderHeading}>
              <View style={styles.folderHeadingText}>
                <Text style={styles.folderTitle} numberOfLines={1}>📁 {folderLabel}</Text>
                <Text style={styles.folderCount}>{t('gallery.imageCount', { count: imageCount })}</Text>
              </View>
              {!isMobileLayout && (
                <TouchableOpacity
                  style={styles.inlineUploadButton}
                  onPress={() => onUploadImage(selectedFolder)}
                  disabled={isUploading}
                  accessibilityRole="button"
                >
                  <Text style={styles.uploadButtonText}>{isUploading ? t('common.uploading') : `+ ${t('common.upload')}`}</Text>
                </TouchableOpacity>
              )}
            </View>
            {images.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyState}>{t('gallery.empty')}</Text>
              </View>
            ) : (
              <FlatList
                key={`gallery-grid-${columns}`}
                style={styles.imageList}
                data={images}
                numColumns={columns}
                keyExtractor={image => image.id}
                columnWrapperStyle={styles.imageRow}
                contentContainerStyle={styles.imageGridContent}
                showsVerticalScrollIndicator={false}
                initialNumToRender={24}
                windowSize={5}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.galleryTile, { width: imageSize, height: imageSize }]}
                    onPress={() => onSelectImage(item, images.map(image => image.id))}
                    accessibilityRole="button"
                    accessibilityLabel={t('gallery.openImage')}
                  >
                    <Image source={{ uri: item.thumb ?? item.image }} style={styles.galleryImage} resizeMode="cover" />
                  </TouchableOpacity>
                )}
                ListFooterComponent={hasMoreImages ? (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={onLoadMore}
                    disabled={isLoadingMore}
                    accessibilityRole="button"
                  >
                    <Text style={styles.loadMoreText}>
                      {isLoadingMore ? t('common.loading') : t('gallery.loadMore')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              />
            )}
            {isMobileLayout && (
              <TouchableOpacity
                style={styles.floatingUploadButton}
                onPress={() => onUploadImage(selectedFolder)}
                disabled={isUploading}
                accessibilityRole="button"
                accessibilityLabel={t('common.upload')}
              >
                <Text style={styles.floatingUploadText}>{isUploading ? '…' : '+'}</Text>
              </TouchableOpacity>
            )}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, minHeight: 22 },
  backButtonText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  refreshButtonText: { color: '#27AE60', fontSize: 15, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center', letterSpacing: 1, marginTop: 15 },
  mobileTitle: { marginTop: 0 },
  subtitle: { fontSize: 13, color: '#aaa', marginBottom: 20, textAlign: 'center' },
  folderList: { flex: 1, width: '100%', marginTop: 10 },
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 16 },
  folderCard: { height: 160, backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  folderIcon: { fontSize: 36, marginBottom: 8 },
  folderName: { color: '#FFF', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  folderCount: { color: '#aaa', fontSize: 12, marginTop: 5 },
  folderHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12, gap: 12 },
  folderHeadingText: { flex: 1 },
  folderTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  inlineUploadButton: { backgroundColor: '#EC2127', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  uploadButtonText: { color: '#FFFFFF', fontWeight: 'bold', textAlign: 'center' },
  imageList: { flex: 1, width: '100%' },
  imageGridContent: { paddingBottom: 24 },
  imageRow: { gap: 8, marginBottom: 8 },
  galleryTile: { overflow: 'hidden', borderRadius: 8, backgroundColor: '#1E1E1E' },
  galleryImage: { width: '100%', height: '100%' },
  emptyStateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyState: { textAlign: 'center', color: '#888' },
  loadMoreButton: { alignSelf: 'center', marginTop: 12, marginBottom: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#292929' },
  loadMoreText: { color: '#FFF', fontWeight: 'bold' },
  floatingUploadButton: { position: 'absolute', right: 20, bottom: 92, width: 56, height: 56, borderRadius: 28, backgroundColor: '#EC2127', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  floatingUploadText: { color: '#FFF', fontSize: 32, lineHeight: 36, fontWeight: '300' },
});
