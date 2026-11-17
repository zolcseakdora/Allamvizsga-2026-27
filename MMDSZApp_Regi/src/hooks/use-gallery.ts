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
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { useCallback, useRef, useState } from 'react';

import { auth, db, storage } from '@/src/config/firebase';
import { FEBRUTALIS_GALLERY_FOLDERS, GALLERY_FOLDERS } from '@/src/constants/gallery';
import type { EventSeason } from '@/src/constants/event-schedule';
import type { GalleryImage } from '@/src/types/gallery';
import { processImage } from '@/src/services/images';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const PAGE_SIZE = 24;

function toGalleryImage(
  id: string,
  data: Record<string, unknown>,
  includeFullImage = true,
  eventType: EventSeason = 'diaknapok',
): GalleryImage | null {
  const storedEventType = data.eventType === 'februtalis' || data.eventType === 'diaknapok'
    ? data.eventType
    : 'diaknapok';
  if (storedEventType !== eventType) return null;

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
    eventType: storedEventType,
  };
}

function folderQueryConstraints(folder: string, eventType: EventSeason): QueryConstraint[] {
  const constraints: QueryConstraint[] = [where('category', '==', folder)];
  if (eventType === 'februtalis') constraints.push(where('eventType', '==', 'februtalis'));
  constraints.push(orderBy('createdAt', 'desc'));
  return constraints;
}

async function imageBlob(uri: string) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('gallery-image-read-failed');
  return response.blob();
}

export function useGallery(eventType: EventSeason = 'diaknapok') {
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

    const countQuery = query(
      collection(db, 'gallery'),
      where('category', '==', folder),
      ...(eventType === 'februtalis' ? [where('eventType', '==', 'februtalis')] : []),
    );
    const [countSnapshot, februtalisCountSnapshot] = await Promise.all([
      getCountFromServer(countQuery),
      eventType === 'diaknapok'
        ? getCountFromServer(query(
          collection(db, 'gallery'),
          where('category', '==', folder),
          where('eventType', '==', 'februtalis'),
        ))
        : Promise.resolve(null),
    ]);
    let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
    let hasMore = true;
    const page: GalleryImage[] = [];

    while (page.length < PAGE_SIZE && hasMore) {
      const constraints = folderQueryConstraints(folder, eventType);
      if (cursor) constraints.push(startAfter(cursor));
      constraints.push(limit(PAGE_SIZE));
      const snapshot = await getDocs(query(collection(db, 'gallery'), ...constraints));
      cursor = snapshot.docs.at(-1) ?? cursor;
      hasMore = snapshot.docs.length === PAGE_SIZE;
      page.push(...snapshot.docs
        .map(item => toGalleryImage(item.id, item.data(), false, eventType))
        .filter((item): item is GalleryImage => item !== null));
    }

    if (requestId !== requestIdRef.current) return;

    cursorRef.current = cursor;
    setImages(page.slice(0, PAGE_SIZE));
    setImageCount(countSnapshot.data().count - (februtalisCountSnapshot?.data().count ?? 0));
    setHasMoreImages(hasMore);
  }, [eventType]);

  const loadMore = useCallback(async (folder: string) => {
    const cursor = cursorRef.current;
    if (!cursor || loadingMoreRef.current) return;

    const requestId = requestIdRef.current;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      let nextCursor: QueryDocumentSnapshot<DocumentData> | null = cursor;
      let hasMore = true;
      const nextImages: GalleryImage[] = [];
      while (nextImages.length < PAGE_SIZE && hasMore) {
        const constraints = folderQueryConstraints(folder, eventType);
        if (nextCursor) constraints.push(startAfter(nextCursor));
        constraints.push(limit(PAGE_SIZE));
        const snapshot = await getDocs(query(collection(db, 'gallery'), ...constraints));
        nextCursor = snapshot.docs.at(-1) ?? nextCursor;
        hasMore = snapshot.docs.length === PAGE_SIZE;
        nextImages.push(...snapshot.docs
          .map(item => toGalleryImage(item.id, item.data(), false, eventType))
          .filter((item): item is GalleryImage => item !== null));
      }

      if (requestId !== requestIdRef.current) return;

      cursorRef.current = nextCursor;
      setImages(current => [...current, ...nextImages]);
      setHasMoreImages(hasMore);
    } finally {
      loadingMoreRef.current = false;
      if (requestId === requestIdRef.current) setIsLoadingMore(false);
    }
  }, [eventType]);

  const getFolderCounts = useCallback(async () => {
    const folders = eventType === 'februtalis' ? FEBRUTALIS_GALLERY_FOLDERS : GALLERY_FOLDERS;
    const entries = await Promise.all(folders.map(async folder => {
      const allFolderQuery = query(
        collection(db, 'gallery'),
        where('category', '==', folder.id),
      );
      const [allCount, februtalisCount] = await Promise.all([
        getCountFromServer(eventType === 'februtalis'
          ? query(allFolderQuery, where('eventType', '==', 'februtalis'))
          : allFolderQuery),
        eventType === 'diaknapok'
          ? getCountFromServer(query(allFolderQuery, where('eventType', '==', 'februtalis')))
          : Promise.resolve(null),
      ]);
      return [folder.id, allCount.data().count - (februtalisCount?.data().count ?? 0)] as const;
    }));

    return Object.fromEntries(entries) as Record<string, number>;
  }, [eventType]);

  const getImage = useCallback(async (imageId: string) => {
    const [gallerySnapshot, imageSnapshot] = await Promise.all([
      getDoc(doc(db, 'gallery', imageId)),
      getDoc(doc(db, 'gallery_images', imageId)),
    ]);
    const galleryData = gallerySnapshot.exists() ? gallerySnapshot.data() : {};
    if (!gallerySnapshot.exists()) return null;
    const storedEventType = galleryData.eventType === 'februtalis' || galleryData.eventType === 'diaknapok'
      ? galleryData.eventType
      : 'diaknapok';
    if (storedEventType !== eventType) return null;
    const fullImage = imageSnapshot.exists()
      ? imageSnapshot.data().image
      : galleryData.image;

    if (typeof fullImage !== 'string' || fullImage.length <= 10) return null;

    return toGalleryImage(imageId, { ...galleryData, image: fullImage }, true, eventType);
  }, [eventType]);

  const deleteImage = useCallback(async (imageId: string) => {
    const imageSnapshot = await getDoc(doc(db, 'gallery', imageId));
    if (!imageSnapshot.exists()) return;
    const storedEventType = imageSnapshot.data().eventType === 'februtalis'
      ? 'februtalis'
      : 'diaknapok';
    if (storedEventType !== eventType) throw new Error('gallery-event-mismatch');
    const fullImageSnapshot = await getDoc(doc(db, 'gallery_images', imageId));
    const imageUrl = fullImageSnapshot.data()?.image;
    const thumbUrl = imageSnapshot.data()?.thumb;
    const batch = writeBatch(db);
    batch.delete(doc(db, 'gallery', imageId));
    batch.delete(doc(db, 'gallery_images', imageId));
    await batch.commit();
    for (const url of [imageUrl, thumbUrl]) {
      if (typeof url !== 'string' || !url.startsWith('https://firebasestorage.googleapis.com/')) continue;
      const encodedPath = new URL(url).pathname.split('/o/')[1];
      if (encodedPath) await deleteObject(ref(storage, decodeURIComponent(encodedPath)));
    }
  }, [eventType]);

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
        const [{ uri: imageUri }, { uri: thumbUri }] = await Promise.all([
          processImage(asset.uri, { maxSide: 1600, quality: 0.7, maxBytes: 700000 }),
          processImage(asset.uri, { maxSide: 400, quality: 0.6, maxBytes: 40000 }),
        ]);

        const imageId = doc(collection(db, 'gallery')).id;
        const eventPrefix = `gallery/${eventType}/${auth.currentUser.uid}/${imageId}`;
        const imageRef = ref(storage, `${eventPrefix}/image.jpg`);
        const thumbRef = ref(storage, `${eventPrefix}/thumb.jpg`);
        let imageUploaded = false;
        let thumbUploaded = false;
        try {
          await uploadBytes(imageRef, await imageBlob(imageUri), { contentType: 'image/jpeg' });
          imageUploaded = true;
          await uploadBytes(thumbRef, await imageBlob(thumbUri), { contentType: 'image/jpeg' });
          thumbUploaded = true;
          const [image, thumb] = await Promise.all([getDownloadURL(imageRef), getDownloadURL(thumbRef)]);
          const batch = writeBatch(db);
          batch.set(doc(db, 'gallery', imageId), {
            image,
            thumb,
            category: folder,
            eventType,
            uploadedBy: uploadedBy || 'Névtelen',
            createdAt: new Date(),
          });
          batch.set(doc(db, 'gallery_images', imageId), { image, eventType });
          await batch.commit();
        } catch (error) {
          await Promise.all([
            ...(imageUploaded ? [deleteObject(imageRef)] : []),
            ...(thumbUploaded ? [deleteObject(thumbRef)] : []),
          ]);
          throw error;
        }
        uploadedCount += 1;
      }

      return uploadedCount;
    } finally {
      setIsUploading(false);
    }
  }, [eventType]);

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
