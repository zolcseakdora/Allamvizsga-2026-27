import * as ImagePicker from 'expo-image-picker';
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { useCallback, useRef, useState } from 'react';

import { auth, db } from '@/src/config/firebase';
import { GALLERY_FOLDERS } from '@/src/constants/gallery';
import type { GalleryImage } from '@/src/types/gallery';
import { makeThumbnail, processImage } from '@/src/services/images';

const PAGE_SIZE = 24;

function toGalleryImage(id: string, data: Record<string, unknown>, includeFullImage = true): GalleryImage | null {
  const storedImage = typeof data.image === 'string' && data.image.length > 10 ? data.image : undefined;
  const thumb = typeof data.thumb === 'string' && data.thumb.length > 10 ? data.thumb : storedImage;
  const fallbackImage = includeFullImage ? storedImage ?? thumb : thumb ?? storedImage;
  if (!fallbackImage) return null;

  const createdAt = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate()
    : data.createdAt instanceof Date
      ? data.createdAt
      : undefined;

  return {
    id,
    image: fallbackImage,
    thumb,
    category: typeof data.category === 'string' ? data.category : undefined,
    uploadedBy: typeof data.uploadedBy === 'string' ? data.uploadedBy : undefined,
    createdAt,
  };
}

export function useGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [imageCount, setImageCount] = useState(0);
  const [hasMoreImages, setHasMoreImages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const refresh = useCallback(async (folder: string) => {
    const requestId = ++requestIdRef.current;
    cursorRef.current = null;
    setImages([]);
    setImageCount(0);
    setHasMoreImages(false);

    const folderQuery = query(
      collection(db, 'gallery'),
      where('category', '==', folder),
      orderBy('createdAt', 'desc'),
    );
    const [snapshot, countSnapshot] = await Promise.all([
      getDocs(query(folderQuery, limit(PAGE_SIZE))),
      getCountFromServer(folderQuery),
    ]);

    if (requestId !== requestIdRef.current) return;

    cursorRef.current = snapshot.docs.at(-1) ?? null;
    setImages(snapshot.docs
      .map(item => toGalleryImage(item.id, item.data(), false))
      .filter((item): item is GalleryImage => item !== null));
    setImageCount(countSnapshot.data().count);
    setHasMoreImages(snapshot.docs.length === PAGE_SIZE);
  }, []);

  const loadMore = useCallback(async (folder: string) => {
    const cursor = cursorRef.current;
    if (!cursor || loadingMoreRef.current) return;

    const requestId = requestIdRef.current;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const snapshot = await getDocs(query(
        collection(db, 'gallery'),
        where('category', '==', folder),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(PAGE_SIZE),
      ));

      if (requestId !== requestIdRef.current) return;

      cursorRef.current = snapshot.docs.at(-1) ?? null;
      const nextImages = snapshot.docs
        .map(item => toGalleryImage(item.id, item.data(), false))
        .filter((item): item is GalleryImage => item !== null);
      setImages(current => [...current, ...nextImages]);
      setHasMoreImages(snapshot.docs.length === PAGE_SIZE);
    } finally {
      loadingMoreRef.current = false;
      if (requestId === requestIdRef.current) setIsLoadingMore(false);
    }
  }, []);

  const getFolderCounts = useCallback(async () => {
    const entries = await Promise.all(GALLERY_FOLDERS.map(async folder => {
      const folderQuery = query(
        collection(db, 'gallery'),
        where('category', '==', folder.id),
      );
      const snapshot = await getCountFromServer(folderQuery);
      return [folder.id, snapshot.data().count] as const;
    }));

    return Object.fromEntries(entries) as Record<string, number>;
  }, []);

  const getImage = useCallback(async (imageId: string) => {
    const [gallerySnapshot, imageSnapshot] = await Promise.all([
      getDoc(doc(db, 'gallery', imageId)),
      getDoc(doc(db, 'gallery_images', imageId)),
    ]);
    const galleryData = gallerySnapshot.exists() ? gallerySnapshot.data() : {};
    const fullImage = imageSnapshot.exists()
      ? imageSnapshot.data().image
      : galleryData.image;

    if (typeof fullImage !== 'string' || fullImage.length <= 10) return null;

    return toGalleryImage(imageId, { ...galleryData, image: fullImage });
  }, []);

  const deleteImage = useCallback(async (imageId: string) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'gallery', imageId));
    batch.delete(doc(db, 'gallery_images', imageId));
    await batch.commit();
  }, []);

  const upload = useCallback(async (folder: string, uploadedBy: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('permission-required');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
      base64: false,
    });

    if (result.canceled || !auth.currentUser) return 0;

    setIsUploading(true);
    try {
      let uploadedCount = 0;
      for (const asset of result.assets) {
        const [{ dataUrl: image }, { dataUrl: thumb }] = await Promise.all([
          processImage(asset.uri, { maxSide: 1600, quality: 0.7, maxBytes: 700000 }),
          makeThumbnail(asset.uri),
        ]);

        const imageId = doc(collection(db, 'gallery')).id;
        const batch = writeBatch(db);
        batch.set(doc(db, 'gallery', imageId), {
          thumb,
          category: folder,
          uploadedBy: uploadedBy || 'Névtelen',
          createdAt: new Date(),
        });
        batch.set(doc(db, 'gallery_images', imageId), { image });
        await batch.commit();
        uploadedCount += 1;
      }

      return uploadedCount;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    images,
    imageCount,
    hasMoreImages,
    isLoadingMore,
    isUploading,
    refresh,
    loadMore,
    getFolderCounts,
    getImage,
    deleteImage,
    upload,
  };
}
