import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { ProfileScreen } from '@/src/screens/profile-screen';
import { auth, db } from '@/src/config/firebase';
import { useAuth } from '@/src/context/AuthContext';
import { UserRole } from '@/src/types/auth';
import { goBackOrHome } from '@/src/utils/navigation';
import { processImage } from '@/src/services/images';

export default function ProfileRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const handleSaveName = async (name: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { name: name.trim() });
      Alert.alert(t('alerts.profileUpdated'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    }
  };

  const handleUploadProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('alerts.permissionRequired'));
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        base64: false,
      });

      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      const uid = auth.currentUser?.uid;
      if (!uri || !uid) return;

      setIsUploading(true);
      try {
        const { dataUrl } = await processImage(uri, { maxSide: 512, quality: 0.8, maxBytes: 700000 });
        await updateDoc(doc(db, 'users', uid), { profileImage: dataUrl });
        Alert.alert(t('alerts.profileUpdated'));
      } finally {
        setIsUploading(false);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'image-too-large') {
        Alert.alert(t('alerts.imageTooLarge'));
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    }
  };

  return (
    <ProfileScreen
      name={profile?.name ?? ''}
      email={user?.email}
      team={profile?.team ?? ''}
      role={profile?.role ?? UserRole.CSAPATTAG}
      profileImage={profile?.profileImage ?? null}
      hasIgazolas={Boolean(profile?.igazolas)}
      isVerified={profile?.isVerified ?? false}
      isUploading={isUploading}
      onBack={() => goBackOrHome(router)}
      onUploadProfileImage={handleUploadProfileImage}
      onSaveName={handleSaveName}
    />
  );
}
