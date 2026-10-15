import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { VerificationPendingScreen } from '@/src/screens/verification-pending-screen';
import { auth, db } from '@/src/config/firebase';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { UserRole } from '@/src/types/auth';

function isUserRole(value: unknown): value is UserRole {
  return Object.values(UserRole).some((role) => role === value);
}

export default function VerificationRoute() {
  const { t } = useTranslation();
  const { profile, user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

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

  const handleConfirmEmail = async () => {
    if (!user?.email) {
      showToast(t('alerts.emailNotAvailable'), 'error');
      return;
    }

    setIsCheckingEmail(true);
    try {
      await user.reload();
      await user.getIdToken(true);
      if (!user.emailVerified) {
        showToast(t('alerts.emailNotVerified'), 'error');
        return;
      }

      const normalizedEmail = user.email.toLowerCase();
      const inviteRef = doc(db, 'invites', normalizedEmail);
      const inviteSnapshot = await getDoc(inviteRef);
      if (!inviteSnapshot.exists() || inviteSnapshot.data().status !== 'Függőben') {
        showToast(t('alerts.noPendingInvite'), 'success');
        return;
      }

      const invite = inviteSnapshot.data();
      const role = invite.role;
      const team = invite.team;
      if (!isUserRole(role) || typeof team !== 'string') {
        throw new Error(t('alerts.invalidInvite'));
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'users', user.uid), { role, team });
      batch.update(inviteRef, { status: 'Elfogadva' });
      await batch.commit();
      showToast(t('alerts.inviteAccepted', { team }), 'success');
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
      onConfirmEmail={() => void handleConfirmEmail()}
      onUploadIgazolas={handleUploadIgazolas}
      onLogout={handleLogout}
    />
  );
}