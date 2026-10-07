import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { VerificationPendingScreen } from '@/src/screens/verification-pending-screen';
import { auth, db } from '@/src/config/firebase';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';

export default function VerificationRoute() {
  const { t } = useTranslation();
  const { profile, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const hasIgazolas = Boolean(profile?.igazolas);

  const handleLogout = async () => {
    await logout();
    router.replace('/auth');
  };

  const handleUploadIgazolas = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return showToast(t('alerts.permissionRequired'), 'error');
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.1,
        base64: true
      });
      
      if (!result.canceled && result.assets[0].base64 && auth.currentUser) {
        const imgStr = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (imgStr.length > 1000000) return showToast(t('alerts.imageTooLarge'), 'error');
        
        await updateDoc(doc(db, "users", auth.currentUser.uid), { igazolas: imgStr, isVerified: false });
        showToast(t('alerts.idUploaded'), 'success');
      }
    } catch (e: any) {
      showToast(t('alerts.generic', { message: e.message }), 'error');
    }
  };

  return (
    <VerificationPendingScreen
      hasIgazolas={hasIgazolas}
      onUploadIgazolas={handleUploadIgazolas}
      onLogout={handleLogout}
    />
  );
}