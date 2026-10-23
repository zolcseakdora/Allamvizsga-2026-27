import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { VerificationPendingScreen } from '@/src/screens/verification-pending-screen';
import { auth, db } from '@/src/config/firebase';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { processImage } from '@/src/services/images';

export default function VerificationRoute() {
  const { t } = useTranslation();
  const { profile, user, logout, resendVerificationEmail, confirmEmailAndRedeem } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [isUploadingIgazolas, setIsUploadingIgazolas] = useState(false);

  const hasIgazolas = Boolean(profile?.igazolas);
  const emailVerified = user?.emailVerified ?? false;

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
        quality: 1,
        base64: false,
      });

      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      const uid = auth.currentUser?.uid;
      if (!uri || !uid) return;

      setIsUploadingIgazolas(true);
      try {
        const { dataUrl } = await processImage(uri, { maxSide: 1600, quality: 0.7, maxBytes: 700000 });
        await updateDoc(doc(db, 'users', uid), { igazolas: dataUrl, isVerified: false });
        showToast(t('alerts.idUploaded'), 'success');
      } finally {
        setIsUploadingIgazolas(false);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'image-too-large') {
        showToast(t('alerts.imageTooLarge'), 'error');
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
    }
  };

  const handleResendVerificationEmail = async () => {
    setIsResendingEmail(true);
    try {
      await resendVerificationEmail();
      showToast(t('alerts.verificationEmailSent'), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleConfirmEmail = async () => {
    setIsCheckingEmail(true);
    try {
      const result = await confirmEmailAndRedeem();
      if (result === 'unverified') {
        showToast(t('alerts.emailNotVerified'), 'error');
      } else if (result === 'none') {
        showToast(t('alerts.noPendingInvite'), 'success');
      } else {
        showToast(t('alerts.inviteAccepted', { team: result.team }), 'success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  return (
    <VerificationPendingScreen
      hasIgazolas={hasIgazolas}
      emailVerified={emailVerified}
      isCheckingEmail={isCheckingEmail}
      isResendingEmail={isResendingEmail}
      isUploadingIgazolas={isUploadingIgazolas}
      onResendVerificationEmail={() => void handleResendVerificationEmail()}
      onConfirmEmail={() => void handleConfirmEmail()}
      onUploadIgazolas={handleUploadIgazolas}
      onLogout={handleLogout}
    />
  );
}