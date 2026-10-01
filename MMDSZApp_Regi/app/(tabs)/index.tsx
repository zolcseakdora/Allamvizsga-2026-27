import * as ImagePicker from 'expo-image-picker';
import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, onSnapshot, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AdminDashboardScreen } from '@/screens/admin-dashboard-screen';
import { AuthScreen } from '@/screens/auth-screen';
import { GalleryImageScreen } from '@/screens/gallery-image-screen';
import { GalleryScreen } from '@/screens/gallery-screen';
import { HomeScreen } from '@/screens/home-screen';
import { LanguageSelectionScreen } from '@/screens/language-selection-screen';
import { MapScreen } from '@/screens/map-screen';
import { PhotoHuntScreen } from '@/screens/photo-hunt-screen';
import { ProgramDetailsScreen } from '@/screens/program-details-screen';
import { ProfileScreen } from '@/screens/profile-screen';
import { RegisteredUsersScreen } from '@/screens/registered-users-screen';
import { ScheduleScreen } from '@/screens/schedule-screen';
import { TeamManagementScreen } from '@/screens/team-management-screen';
import { TeamsScreen } from '@/screens/teams-screen';
import { VerificationPendingScreen } from '@/screens/verification-pending-screen';

import i18n from '@/i18n';
import { EVENT_DAY_LABEL_KEYS } from '@/constants/event-days';

const firebaseConfig = {
  apiKey: "AIzaSyAXrpkSdAD3aqiyViv_AUMxH6OTSiMI1Zk",
  authDomain: "allamvizsga-47738.firebaseapp.com",
  projectId: "allamvizsga-47738",
  storageBucket: "allamvizsga-47738.firebasestorage.app",
  messagingSenderId: "100668962875",
  appId: "1:100668962875:web:f0472077febd029a64841e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const { t } = useTranslation();
  const [language, setLanguage] = useState<'hu' | 'en' | null>(null);
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('Csapattag');
  const [hasIgazolas, setHasIgazolas] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [registeredUsers, setRegisteredUsers] = useState<Array<any>>([]);
  const [programs, setPrograms] = useState<Array<any>>([]);
  const [mapPoints, setMapPoints] = useState<Array<any>>([]);
  const [galleryImages, setGalleryImages] = useState<Array<any>>([]);
  const [selectedGalleryFolder, setSelectedGalleryFolder] = useState<string | null>(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<any>(null);
  const [photoHuntProgress, setPhotoHuntProgress] = useState<any>({});
  const [selectedProgram, setSelectedProgram] = useState<any>(null);

  const [allTeams, setAllTeams] = useState<Array<any>>([]);
  const [teamDescription, setTeamDescription] = useState('');
  const [teamVideoLink, setTeamVideoLink] = useState('');
  const [teamLogo, setTeamLogo] = useState<string | null>(null);
  const [teamFlag, setTeamFlag] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Csapattag' | 'Alcsapatkapitány'>('Csapattag');

  const [selectedCategory, setSelectedCategory] = useState<string>('Szerda');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  const [adminEventTitle, setAdminEventTitle] = useState('');
  const [adminEventTime, setAdminEventTime] = useState('');
  const [adminEventLocation, setAdminEventLocation] = useState('');
  const [adminEventDay, setAdminEventDay] = useState('Szerda');
  const [isUploading, setIsUploading] = useState(false);

  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [showPending, setShowPending] = useState(false);

  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');

  const safeRole = (userRole || '').toLowerCase();
  const isOrganizerOrHead = safeRole.includes('szervez');
  const showIgazolasUpload = safeRole.includes('csapat') || safeRole.includes('kapitany') || safeRole.includes('kapitány');
  const isCaptainOrDeputy = safeRole.includes('kapitany') || safeRole.includes('kapitány');

  const handleSelectLanguage = (nextLanguage: 'hu' | 'en') => {
    void i18n.changeLanguage(nextLanguage).then(() => setLanguage(nextLanguage));
  };

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

    let unsubscribeDb: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeDb?.();
      if (user) {
        unsubscribeDb = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            if (user.email === 'dorazolcseak@gmail.com') {
              setUserRole('Főszervező');
            } else {
              setUserRole(data.role || 'Csapattag');
            }

            setHasIgazolas(!!data.igazolas);
            setIsVerified(!!data.isVerified);
            setFullName(data.name || '');
            setTeamName(data.team || '');
            setProfileImage(data.profileImage || null);
            setIsLoggedIn(true);
          }
        });
      } else {
        setIsLoggedIn(false);
        setUserRole('Csapattag');
        setHasIgazolas(false);
        setIsVerified(false);
      }
    });

    return () => {
      clearInterval(timer);
      unsubscribeAuth();
      unsubscribeDb?.();
    };
  }, []);

  const resetForm = () => { setFullName(''); setEmail(''); setPassword(''); setTeamName(''); setSecurePassword(true); };

  const handleRegister = async () => {
    if (!fullName || !email || !password) return alert(t('alerts.requiredFields'));
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), { 
        name: fullName, 
        email: email, 
        team: teamName || 'Egyéni', 
        role: 'Csapattag', 
        createdAt: new Date(), 
        isVerified: false 
      });
    } catch (error: any) { alert(t('alerts.generic', { message: error.message })); }
  };

  const handleLogin = async () => {
    if (!email || !password) return alert(t('alerts.emailPasswordRequired'));
    try { await signInWithEmailAndPassword(auth, email, password); } catch (error: any) { alert(t('alerts.wrongCredentials')); }
  };

  const handleForgotPassword = async () => {
    if (!email) return alert(t('alerts.enterEmailForReset'));
    try { await sendPasswordResetEmail(auth, email); alert(t('alerts.resetEmailSent')); } catch (error: any) { alert(t('alerts.generic', { message: error.message })); }
  };

  const handleLogout = () => { signOut(auth); setCurrentView(null); setSelectedProgram(null); setSelectedGalleryFolder(null); setSelectedGalleryImage(null); resetForm(); };

  const handleUploadIgazolas = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return alert(t('alerts.permissionRequired'));
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.1, base64: true });
      if (!result.canceled && result.assets[0].base64 && auth.currentUser) {
        const imgStr = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (imgStr.length > 1000000) return alert(t('alerts.imageTooLarge'));
        await updateDoc(doc(db, "users", auth.currentUser.uid), { igazolas: imgStr, isVerified: false });
        alert(t('alerts.idUploaded'));
      }
    } catch (e: any) { alert(t('alerts.generic', { message: e.message })); }
  };

  const handleUploadProfileImage = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return alert(t('alerts.permissionRequired'));
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.1, base64: true });
      if (!result.canceled && result.assets[0].base64 && auth.currentUser) {
        const imgStr = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (imgStr.length > 1000000) return alert(t('alerts.imageTooLarge'));
        await updateDoc(doc(db, "users", auth.currentUser.uid), { profileImage: imgStr });
        setProfileImage(imgStr);
        alert(t('alerts.profileUpdated'));
      }
    } catch (e: any) { alert(t('alerts.generic', { message: e.message })); }
  };

  const handleUploadGalleryImage = async (folderName: string) => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return alert(t('alerts.permissionRequired'));
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.15, base64: true });
      if (!result.canceled && result.assets && result.assets.length > 0 && auth.currentUser) {
        for (let asset of result.assets) {
          if (asset.base64) {
            const imgStr = `data:image/jpeg;base64,${asset.base64}`;
            if (imgStr.length <= 1000000) {
              await addDoc(collection(db, "gallery"), { 
                image: imgStr, 
                category: folderName, 
                uploadedBy: fullName || 'Névtelen', 
                createdAt: new Date() 
              });
            }
          }
        }
        alert(t('alerts.galleryUploaded', { count: result.assets.length, folder: folderName }));
        fetchGallery(folderName);
      }
    } catch (e: any) { alert(t('alerts.generic', { message: e.message })); }
  };

  const handleUploadPhotoHunt = async (taskId: number) => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return alert(t('alerts.permissionRequired'));
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.1, base64: true });
      if (!result.canceled && result.assets[0].base64 && auth.currentUser) {
        const fileStr = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (fileStr.length > 1000000) return alert(t('alerts.photoTooLarge'));
        await setDoc(doc(db, "photohunt_uploads", `${auth.currentUser.uid}_${taskId}`), { taskId: taskId, userId: auth.currentUser.uid, file: fileStr, uploadedAt: new Date() });
        alert(t('alerts.photoHuntUploaded'));
        fetchPhotoHuntProgress();
      }
    } catch (e: any) { alert(t('alerts.generic', { message: e.message })); }
  };

  const handleAddAdminEvent = async () => {
    if (!adminEventTitle || !adminEventTime || !adminEventLocation) {
      return alert(t('alerts.fillProgramFields'));
    }
    setIsUploading(true);
    try {
      await addDoc(collection(db, "programs"), {
        title: adminEventTitle,
        time: adminEventTime,
        helyszín: adminEventLocation,
        day: adminEventDay,
        createdAt: new Date(),
        createdBy: auth.currentUser?.uid
      });
      const dayKey = EVENT_DAY_LABEL_KEYS[adminEventDay as keyof typeof EVENT_DAY_LABEL_KEYS];
      alert(t('alerts.programAdded', { day: dayKey ? t(dayKey) : adminEventDay }));
      setAdminEventTitle('');
      setAdminEventTime('');
      setAdminEventLocation('');
    } catch (error: any) {
      alert(t('alerts.generic', { message: error.message }));
    } finally {
      setIsUploading(false);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const q = query(collection(db, "users"));
      const snapshot = await getDocs(q);
      const list: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.igazolas) {
          list.push({ id: doc.id, ...data });
        }
      });
      setPendingUsers(list);
      setShowPending(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveId = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { isVerified: true });
      alert(t('alerts.idApproved'));
      fetchPendingUsers();
    } catch (error: any) {
      alert(t('alerts.generic', { message: error.message }));
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle || !notifBody) return alert(t('alerts.notificationRequired'));
    try {
      await addDoc(collection(db, "notifications"), {
        title: notifTitle,
        body: notifBody,
        createdAt: new Date(),
      });
      alert(t('alerts.notificationSent'));
      setNotifTitle('');
      setNotifBody('');
    } catch (e: any) {
      alert(t('alerts.generic', { message: e.message }));
    }
  };

  const handleSendTeamInvite = async () => {
    if (!inviteEmail || !teamName) return alert(t('alerts.inviteEmailRequired'));
    try {
      const translatedInviteRole = inviteRole === 'Csapattag' ? t('roles.member') : t('roles.deputy');
      const inviteEmailBody = t('teamManagement.inviteEmailBody', { teamName, role: translatedInviteRole });
      // 1. Belső meghívó mentése az appnak (opcionális, de jó ha megmarad)
      await addDoc(collection(db, "invites"), {
        email: inviteEmail,
        team: teamName,
        role: inviteRole,
        invitedBy: fullName || 'Csapatkapitány',
        createdAt: new Date(),
        status: 'Függőben'
      });

      // 2. VALÓS E-MAIL KÜLDÉSE a Firebase Trigger Email bővítménynek
      await addDoc(collection(db, "mail"), {
        to: inviteEmail,
        message: {
          subject: t('teamManagement.inviteEmailSubject'),
          text: `${t('teamManagement.inviteEmailGreeting')} ${inviteEmailBody} ${t('teamManagement.inviteEmailAction')}`,
          html: `
            <h3>${t('teamManagement.inviteEmailGreeting')}</h3>
            <p>${inviteEmailBody}</p>
            <p>${t('teamManagement.inviteEmailAction')}</p>
          `
        }
      });
      
      alert(t('alerts.inviteSent', { email: inviteEmail }));
      setInviteEmail('');
    } catch (e: any) {
      alert(t('alerts.generic', { message: e.message }));
    }
  };

  const fetchTeamData = async () => {
    if (!teamName) return;
    try {
      const docRef = doc(db, "teams", teamName);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const d = docSnap.data();
        setTeamDescription(d.description || '');
        setTeamVideoLink(d.videoLink || '');
        setTeamLogo(d.logo || null);
        setTeamFlag(d.flag || null);
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveTeamData = async () => {
    if (!teamName) return alert(t('alerts.teamNameRequired'));
    try {
      await setDoc(doc(db, "teams", teamName), { description: teamDescription, videoLink: teamVideoLink, updatedAt: new Date(), name: teamName }, { merge: true });
      alert(t('alerts.teamSaved'));
    } catch (e: any) { alert(t('alerts.generic', { message: e.message })); }
  };

  const handleUploadTeamImage = async (type: 'logo' | 'flag') => {
    if (!teamName) return alert(t('alerts.teamNameRequired'));
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return alert(t('alerts.permissionRequired'));
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.15, base64: true });
      if (!result.canceled && result.assets[0].base64) {
        const imgStr = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (imgStr.length > 1000000) return alert(t('alerts.teamImageTooLarge'));
        await setDoc(doc(db, "teams", teamName), { [type]: imgStr, name: teamName }, { merge: true });
        if (type === 'logo') setTeamLogo(imgStr);
        if (type === 'flag') setTeamFlag(imgStr);
        alert(t(type === 'logo' ? 'alerts.teamLogoUpdated' : 'alerts.teamFlagUpdated'));
      }
    } catch (e: any) { alert(t('alerts.generic', { message: e.message })); }
  };

  const fetchAllTeams = async () => {
    try {
      const q = query(collection(db, "teams"));
      const snapshot = await getDocs(q);
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setAllTeams(list);
    } catch (e) { console.error(e); }
  };

  const fetchRegisteredUsers = async () => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const list: any[] = [];
    snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    setRegisteredUsers(list);
  };

  const getFestivalTimeScore = (timeStr: string) => {
    if (!timeStr) return 99999;
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return 99999;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (h < 7) h += 24;
    return h * 60 + m;
  };

  const fetchPrograms = async () => {
    const q = query(collection(db, "programs"));
    const snapshot = await getDocs(q);
    const list: any[] = [];
    snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    list.sort((a, b) => getFestivalTimeScore(a.time) - getFestivalTimeScore(b.time));
    setPrograms(list);
  };

  const fetchMapPoints = async () => {
    try {
      const snapshot = await getDocs(collection(db, "map_points"));
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setMapPoints(list);
    } catch (e) { console.error(e); }
  };

  const fetchGallery = async (folderName: string) => {
    try {
      const q = query(collection(db, "gallery"), where("category", "==", folderName));
      const snapshot = await getDocs(q);
      const list: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.image && data.image.length > 10) list.push({ id: doc.id, ...data });
      });
      setGalleryImages(list);
    } catch (e) { console.error(e); }
  };

  const fetchPhotoHuntProgress = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, "photohunt_uploads"));
      const snapshot = await getDocs(q);
      const progress: any = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.userId === auth.currentUser?.uid) progress[data.taskId] = true;
      });
      setPhotoHuntProgress(progress);
    } catch (e) { console.error(e); }
  };

  const handleDownloadImage = (imageBase64: string) => {
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = imageBase64;
      link.download = `diaknapok_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Linking.openURL(imageBase64).catch(() => alert(t('alerts.downloadFailed')));
    }
  };

  if (!language) {
    return <LanguageSelectionScreen onSelectLanguage={handleSelectLanguage} />;
  }

  if (!isLoggedIn) {
    return (
      <AuthScreen
        isLoginMode={isLoginMode}
        fullName={fullName}
        teamName={teamName}
        email={email}
        password={password}
        securePassword={securePassword}
        onFullNameChange={setFullName}
        onTeamNameChange={setTeamName}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onTogglePassword={() => setSecurePassword(!securePassword)}
        onSubmit={isLoginMode ? handleLogin : handleRegister}
        onToggleMode={() => { setIsLoginMode(!isLoginMode); resetForm(); }}
      />
    );
  }

  if (isLoggedIn && !isVerified && userRole !== 'Főszervező') {
    return <VerificationPendingScreen hasIgazolas={hasIgazolas} onUploadIgazolas={handleUploadIgazolas} onLogout={handleLogout} />;
  }

  if (currentView === 'profile') {
    return (
      <ProfileScreen
        name={fullName}
        email={auth.currentUser?.email}
        team={teamName}
        role={userRole}
        profileImage={profileImage}
        hasIgazolas={hasIgazolas}
        isVerified={isVerified}
        onBack={() => setCurrentView(null)}
        onUploadProfileImage={handleUploadProfileImage}
      />
    );
  }

  if (currentView === 'allTeams') {
    return (
      <TeamsScreen
        teams={allTeams}
        onBack={() => setCurrentView(null)}
        onRefresh={fetchAllTeams}
        onOpenVideo={(videoLink) => {
          if (videoLink) Linking.openURL(videoLink).catch(() => alert(t('alerts.openLinkFailed')));
          else alert(t('alerts.noTeamVideo'));
        }}
      />
    );
  }

  if (currentView === 'teamManagement') {
    return (
      <TeamManagementScreen
        teamName={teamName}
        teamDescription={teamDescription}
        teamVideoLink={teamVideoLink}
        teamLogo={teamLogo}
        teamFlag={teamFlag}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        onBack={() => setCurrentView(null)}
        onRefresh={fetchTeamData}
        onDescriptionChange={setTeamDescription}
        onVideoLinkChange={setTeamVideoLink}
        onUploadTeamImage={handleUploadTeamImage}
        onSaveTeamData={handleSaveTeamData}
        onInviteEmailChange={setInviteEmail}
        onInviteRoleChange={setInviteRole}
        onSendTeamInvite={handleSendTeamInvite}
      />
    );
  }

  if (selectedGalleryImage) {
    return (
      <GalleryImageScreen
        image={selectedGalleryImage}
        onBack={() => setSelectedGalleryImage(null)}
        onDownloadImage={handleDownloadImage}
      />
    );
  }

  if (currentView === 'gallery') {
    return (
      <GalleryScreen
        selectedFolder={selectedGalleryFolder}
        images={galleryImages}
        onBack={() => { if (selectedGalleryFolder) setSelectedGalleryFolder(null); else setCurrentView(null); }}
        onRefresh={fetchGallery}
        onSelectFolder={(folder) => { setSelectedGalleryFolder(folder); fetchGallery(folder); }}
        onUploadImage={handleUploadGalleryImage}
        onSelectImage={setSelectedGalleryImage}
      />
    );
  }

  if (currentView === 'map') {
    return <MapScreen points={mapPoints} onBack={() => setCurrentView(null)} onRefresh={fetchMapPoints} />;
  }

  if (selectedProgram) {
    return <ProgramDetailsScreen program={selectedProgram} onBack={() => setSelectedProgram(null)} />;
  }

  if (currentView === 'schedule') {
    return (
      <ScheduleScreen
        programs={programs}
        selectedCategory={selectedCategory}
        onBack={() => setCurrentView(null)}
        onRefresh={fetchPrograms}
        onSelectCategory={setSelectedCategory}
        onSelectProgram={setSelectedProgram}
      />
    );
  }

  if (currentView === 'photohunt') {
    return (
      <PhotoHuntScreen
        progress={photoHuntProgress}
        onBack={() => setCurrentView(null)}
        onRefresh={fetchPhotoHuntProgress}
        onUpload={handleUploadPhotoHunt}
      />
    );
  }

  if (currentView === 'usersList') {
    return <RegisteredUsersScreen users={registeredUsers} onBack={() => setCurrentView(null)} onRefresh={fetchRegisteredUsers} />;
  }

  if (currentView === 'adminDashboard') {
    return (
      <AdminDashboardScreen
        adminEventDay={adminEventDay}
        adminEventTitle={adminEventTitle}
        adminEventTime={adminEventTime}
        adminEventLocation={adminEventLocation}
        isUploading={isUploading}
        notifTitle={notifTitle}
        notifBody={notifBody}
        showPending={showPending}
        pendingUsers={pendingUsers}
        onBack={() => setCurrentView(null)}
        onEventDayChange={setAdminEventDay}
        onEventTitleChange={setAdminEventTitle}
        onEventTimeChange={setAdminEventTime}
        onEventLocationChange={setAdminEventLocation}
        onAddEvent={handleAddAdminEvent}
        onNotifTitleChange={setNotifTitle}
        onNotifBodyChange={setNotifBody}
        onSendNotification={handleSendNotification}
        onFetchPendingUsers={fetchPendingUsers}
        onApproveUser={handleApproveId}
      />
    );
  }

  return (
    <HomeScreen
      userRole={userRole}
      timeLeft={timeLeft}
      showIgazolasUpload={showIgazolasUpload}
      hasIgazolas={hasIgazolas}
      isVerified={isVerified}
      isCaptainOrDeputy={isCaptainOrDeputy}
      isOrganizerOrHead={isOrganizerOrHead}
      onOpenProfile={() => setCurrentView('profile')}
      onLogout={handleLogout}
      onUploadIgazolas={handleUploadIgazolas}
      onOpenSchedule={() => { fetchPrograms(); setCurrentView('schedule'); }}
      onOpenTeams={() => { fetchAllTeams(); setCurrentView('allTeams'); }}
      onOpenMap={() => { fetchMapPoints(); setCurrentView('map'); }}
      onOpenGallery={() => { setSelectedGalleryFolder(null); setCurrentView('gallery'); }}
      onOpenPhotoHunt={() => { fetchPhotoHuntProgress(); setCurrentView('photohunt'); }}
      onOpenTeamManagement={() => { fetchTeamData(); setCurrentView('teamManagement'); }}
      onOpenRegisteredUsers={() => { fetchRegisteredUsers(); setCurrentView('usersList'); }}
      onOpenAdmin={() => setCurrentView('adminDashboard')}
    />
  );
}

