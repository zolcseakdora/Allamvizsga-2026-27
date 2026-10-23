import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { HomeScreen } from '@/src/screens/home-screen';
import { auth, db } from '@/src/config/firebase';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';

import { UserRole } from '@/src/types/auth';
import { canRole } from '@/src/constants/roles';
import { processImage } from '@/src/services/images';

export default function App() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const {
    profile,
    user,
    resendVerificationEmail,
    confirmEmailAndRedeem,
  } = useAuth();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [isUploadingIgazolas, setIsUploadingIgazolas] = useState(false);

  const userRole = profile?.role ?? UserRole.CSAPATTAG;
  const hasIgazolas = Boolean(profile?.igazolas);
  const isVerified = profile?.isVerified ?? false;
  
  const showIgazolasUpload = canRole(userRole, 'uploadIgazolas');

  useEffect(() => {
    const targetDate = new Date('2027-05-20T00:00:00');
    const timer = setInterval(() => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        setTimeLeft({ days, hours, minutes });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      if (uri && uid) {
        setIsUploadingIgazolas(true);
        const { dataUrl } = await processImage(uri, { maxSide: 1600, quality: 0.7, maxBytes: 700000 });
        await updateDoc(doc(db, 'users', uid), { igazolas: dataUrl, isVerified: false });
        showToast(t('alerts.idUploaded'), 'success');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'image-too-large') {
        showToast(t('alerts.imageTooLarge'), 'error');
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
    } finally {
      setIsUploadingIgazolas(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <HomeScreen
        emailVerified={user?.emailVerified ?? false}
        isCheckingEmail={isCheckingEmail}
        isResendingEmail={isResendingEmail}
        timeLeft={timeLeft}
        showIgazolasUpload={showIgazolasUpload}
        hasIgazolas={hasIgazolas}
        isVerified={isVerified}
        isUploadingIgazolas={isUploadingIgazolas}
        onUploadIgazolas={handleUploadIgazolas}
        onResendVerificationEmail={() => void handleResendVerificationEmail()}
        onConfirmEmail={() => void handleConfirmEmail()}
      />
    </View>
  );
}