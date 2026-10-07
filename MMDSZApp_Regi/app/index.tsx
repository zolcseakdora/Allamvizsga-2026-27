import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { HomeScreen } from '@/src/screens/home-screen';
import { auth, db } from '@/src/config/firebase';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';

import { UserRole } from '@/src/types/auth';

export default function App() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, logout } = useAuth();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  const userRole = profile?.role ?? UserRole.CSAPATTAG;
  const hasIgazolas = Boolean(profile?.igazolas);
  const isVerified = profile?.isVerified ?? false;
  const safeRole = userRole.toLowerCase();
  
  const isOrganizerOrHead = userRole === UserRole.FOSZERVEZO || userRole === UserRole.SZERVEZO;
  const isCaptainOrDeputy = userRole === UserRole.CSAPATKAPITANY || userRole === UserRole.ALCSAPATKAPITANY;
  const showIgazolasUpload = userRole === UserRole.CSAPATTAG || isCaptainOrDeputy;

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

  const handleLogout = () => { 
    void logout(); 
  };

  const handleUploadIgazolas = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return showToast(t('alerts.permissionRequired'), 'error');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.1, base64: true });
      if (!result.canceled && result.assets[0].base64 && auth.currentUser) {
        const imgStr = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (imgStr.length > 1000000) return showToast(t('alerts.imageTooLarge'), 'error');
        await updateDoc(doc(db, "users", auth.currentUser.uid), { igazolas: imgStr, isVerified: false });
        showToast(t('alerts.idUploaded'), 'success');
      }
    } catch (e: any) { showToast(t('alerts.generic', { message: e.message }), 'error'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <HomeScreen
        userRole={userRole}
        timeLeft={timeLeft}
        showIgazolasUpload={showIgazolasUpload}
        hasIgazolas={hasIgazolas}
        isVerified={isVerified}
        isCaptainOrDeputy={isCaptainOrDeputy}
        isOrganizerOrHead={isOrganizerOrHead}
        onOpenProfile={() => router.push('/profile')}
        onLogout={handleLogout}
        onUploadIgazolas={handleUploadIgazolas}
        onOpenSchedule={() => router.push('/schedule')}
        onOpenTeams={() => router.push('/teams')}
        onOpenMap={() => router.push('/map')}
        onOpenGallery={() => router.push('/gallery')}
        onOpenPhotoHunt={() => router.push('/photo-hunt')}
        onOpenTeamManagement={() => router.push('/team-management')}
        onOpenRegisteredUsers={() => router.push('/users')}
        onOpenAdmin={() => router.push('/admin')}
      />
    </View>
  );
}