import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { VerificationPendingScreen } from '@/src/screens/verification-pending-screen';
import { auth } from '@/src/config/firebase';
import { useAuth } from '@/src/context/AuthContext';
import { useEventSeason } from '@/src/context/EventSeasonContext';
import { useToast } from '@/src/context/ToastContext';
import { processImage } from '@/src/services/images';
import { uploadStudentVerification } from '@/src/services/student-verification';

export default function VerificationRoute() {
  const { t } = useTranslation();
  const { profile, user, logout, resendVerificationEmail, confirmEmailAndRedeem } = useAuth();
  const { eventType } = useEventSeason();
  const { showToast } = useToast();
  const router = useRouter();
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [isUploadingIgazolas, setIsUploadingIgazolas] = useState(false);

  const eventVerification = profile?.eventVerifications?.[eventType];
  const hasIgazolas = Boolean(eventVerification?.imageUrl
    || (eventType === 'diaknapok' && !eventVerification && profile?.igazolas));
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
        const { uri: processedUri } = await processImage(uri, { maxSide: 1600, quality: 0.7, maxBytes: 700000 });
        await uploadStudentVerification(processedUri, uid, eventType);
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
        showToast(result.eventType
          ? t('alerts.eventInviteAccepted', { eventName: t(`eventNames.${result.eventType}`) })
          : t('alerts.inviteAccepted', { team: result.team }), 'success');
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
      eventName={t(`eventNames.${eventType}`)}
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