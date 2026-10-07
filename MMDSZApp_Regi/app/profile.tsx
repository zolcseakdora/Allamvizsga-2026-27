import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { ProfileScreen } from '@/src/screens/profile-screen';
import { auth, db } from '@/src/config/firebase';
import { useAuth } from '@/src/context/AuthContext';
import { UserRole } from '@/src/types/auth';

export default function ProfileRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, profile } = useAuth();

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
        quality: 0.1,
        base64: true,
      });

      const base64 = result.canceled ? undefined : result.assets[0]?.base64;
      if (!base64 || !auth.currentUser) return;

      const image = `data:image/jpeg;base64,${base64}`;
      if (image.length > 1000000) {
        Alert.alert(t('alerts.imageTooLarge'));
        return;
      }

      await updateDoc(doc(db, 'users', auth.currentUser.uid), { profileImage: image });
      Alert.alert(t('alerts.profileUpdated'));
    } catch (error) {
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
      onBack={() => router.back()}
      onUploadProfileImage={handleUploadProfileImage}
    />
  );
}
