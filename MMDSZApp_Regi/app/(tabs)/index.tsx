import * as ImagePicker from 'expo-image-picker';
import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, onSnapshot, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Image, Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

const PHOTO_HUNT_TASKS = [
  { id: 1, title: 'Szamárral a fabudiban', criteria: 'szamár, fabudi' },
  { id: 2, title: 'Egy csűrbe, szalmába', criteria: 'csűr, szalma' },
  { id: 3, title: 'Ásó, kapa, nagyharang', criteria: 'ásó, kapa, nagyharang' },
  { id: 4, title: 'Happy ending (videó)', criteria: 'kreatív' },
  { id: 5, title: 'Kép juhásszal + nyáj', criteria: 'juhász, nyáj' },
  { id: 6, title: 'Mezőségi a szervezőkkel (videó)', criteria: 'mezőségi néptánc' },
  { id: 7, title: 'Kürtőskalács a szervezőknek', criteria: 'kürtőskalács, szervezők' },
  { id: 8, title: 'Aranybárány', criteria: 'arany színű bárány' },
  { id: 9, title: 'Békacsókolás (videó)', criteria: 'béka, csókolás' },
  { id: 10, title: 'Mustkészítés lábbal (videó)', criteria: 'mustkészítés, lábbal' },
  { id: 11, title: 'Vajköpülés (videó)', criteria: 'vaj, köpülés' },
  { id: 12, title: 'Kecskefejés (videó)', criteria: 'kecske, fejés' },
  { id: 13, title: 'Kolbászokkal teli éléskamra', criteria: 'éléskamra, kolbászok' },
  { id: 14, title: 'Itassatok fröccsel egy szervezőt', criteria: 'fröccs, szervező' },
  { id: 15, title: 'Kép a legrégebbi szervezővel', criteria: 'Sancy' },
];

const GALLERY_FOLDERS = [
  { id: 'Sportok', name: 'Sportok ⚽', icon: '⚽' },
  { id: 'Felvonulás', name: 'Felvonulás 🚩', icon: '🚩' },
  { id: 'Harácsolás', name: 'Harácsolás 📜', icon: '📜' },
  { id: 'PhotoHunt', name: 'Photo Hunt 📷', icon: '📷' },
  { id: 'Weekend játékok', name: 'Weekend játékok 🎮', icon: '🎮' },
  { id: 'Party', name: 'Party 🎉', icon: '🎉' },
  { id: 'Egyéb', name: 'Egyéb pillanatok 📸', icon: '📸' },
];

export default function App() {
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

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const unsubscribeDb = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
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
        return () => unsubscribeDb(); 
      } else {
        setIsLoggedIn(false);
        setUserRole('Csapattag');
        setHasIgazolas(false);
        setIsVerified(false);
      }
    });

    return () => { clearInterval(timer); unsubscribeAuth(); };
  }, []);

  const resetForm = () => { setFullName(''); setEmail(''); setPassword(''); setTeamName(''); setSecurePassword(true); };

  const handleRegister = async () => {
    if (!fullName || !email || !password) return alert('Minden mező kötelező!');
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
    } catch (error: any) { alert(`Hiba: ${error.message}`); }
  };

  const handleLogin = async () => {
    if (!email || !password) return alert('E-mail és jelszó kötelező!');
    try { await signInWithEmailAndPassword(auth, email, password); } catch (error: any) { alert('Hibás e-mail vagy jelszó!'); }
  };

  const handleForgotPassword = async () => {
    if (!email) return alert('Írd be az e-mail címedet a fenti mezőbe!');
    try { await sendPasswordResetEmail(auth, email); alert('Visszaállító e-mail elküldve!'); } catch (error: any) { alert(`Hiba: ${error.message}`); }
  };

  const handleLogout = () => { signOut(auth); setCurrentView(null); setSelectedProgram(null); setSelectedGalleryFolder(null); setSelectedGalleryImage(null); resetForm(); };

  const handleUploadIgazolas = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return alert("Engedély szükséges!");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.1, base64: true });
      if (!result.canceled && result.assets[0].base64 && auth.currentUser) {
        const imgStr = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (imgStr.length > 1000000) return alert("A kép túl nagy!");
        await updateDoc(doc(db, "users", auth.currentUser.uid), { igazolas: imgStr, isVerified: false });
        alert("Sikeres feltöltés! Várakozás a jóváhagyásra.");
      }
    } catch (e: any) { alert("Hiba: " + e.message); }
  };

  const handleUploadProfileImage = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return alert("Engedély szükséges!");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.1, base64: true });
      if (!result.canceled && result.assets[0].base64 && auth.currentUser) {
        const imgStr = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (imgStr.length > 1000000) return alert("A kép túl nagy!");
        await updateDoc(doc(db, "users", auth.currentUser.uid), { profileImage: imgStr });
        setProfileImage(imgStr);
        alert("Profilkép frissítve!");
      }
    } catch (e: any) { alert("Hiba: " + e.message); }
  };

  const handleUploadGalleryImage = async (folderName: string) => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return alert("Engedély szükséges!");
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
        alert(`Sikeresen feltöltve ${result.assets.length} kép a(z) ${folderName} mappába! 📸`);
        fetchGallery(folderName);
      }
    } catch (e: any) { alert("Hiba: " + e.message); }
  };

  const handleUploadPhotoHunt = async (taskId: number) => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return alert("Engedély szükséges!");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.1, base64: true });
      if (!result.canceled && result.assets[0].base64 && auth.currentUser) {
        const fileStr = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (fileStr.length > 1000000) return alert("A fájl túl nagy! Kérjük készíts nagyon rövid videót vagy kisebb képet.");
        await setDoc(doc(db, "photohunt_uploads", `${auth.currentUser.uid}_${taskId}`), { taskId: taskId, userId: auth.currentUser.uid, file: fileStr, uploadedAt: new Date() });
        alert("Sikeres feltöltés! ✅");
        fetchPhotoHuntProgress();
      }
    } catch (e: any) { alert("Hiba: " + e.message); }
  };

  const handleAddAdminEvent = async () => {
    if (!adminEventTitle || !adminEventTime || !adminEventLocation) {
      return alert("Kérlek, tölts ki minden mezőt!");
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
      alert(`Program sikeresen hozzáadva a(z) ${adminEventDay} naphoz! ✅`);
      setAdminEventTitle('');
      setAdminEventTime('');
      setAdminEventLocation('');
    } catch (error: any) {
      alert("Hiba történt: " + error.message);
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
      alert("Diákigazolvány sikeresen jóváhagyva! ✅");
      fetchPendingUsers();
    } catch (error: any) {
      alert("Hiba: " + error.message);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle || !notifBody) return alert("Add meg az értesítés címét és szövegét!");
    try {
      await addDoc(collection(db, "notifications"), {
        title: notifTitle,
        body: notifBody,
        createdAt: new Date(),
      });
      alert("Értesítés sikeresen elküldve minden résztvevőnek! 📯");
      setNotifTitle('');
      setNotifBody('');
    } catch (e: any) {
      alert("Hiba: " + e.message);
    }
  };

  const handleSendTeamInvite = async () => {
    if (!inviteEmail || !teamName) return alert("Add meg a csapattag e-mail címét!");
    try {
      await addDoc(collection(db, "invites"), {
        email: inviteEmail,
        team: teamName,
        role: inviteRole,
        invitedBy: fullName || 'Csapatkapitány',
        createdAt: new Date(),
        status: 'Függőben'
      });

      const emailMessage = `Meghívást kaptál a Diáknapokra! Töltsd le az appot, regisztrálj, majd kapod az e-mailt a jóváhagyással és lépj be, hogy minden információt időben tudj meg a Diáknapokról! (Csapat: ${teamName}, Szerep: ${inviteRole})`;
      
      alert(`Meghívó sikeresen elküldve ide: ${inviteEmail} ✉️\n\n[Elküldött e-mail szövege]:\n"${emailMessage}"`);
      setInviteEmail('');
    } catch (e: any) {
      alert("Hiba a meghíváskor: " + e.message);
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
    if (!teamName) return alert("Nincs beállítva csapatnév a profilodban!");
    try {
      await setDoc(doc(db, "teams", teamName), { description: teamDescription, videoLink: teamVideoLink, updatedAt: new Date(), name: teamName }, { merge: true });
      alert("Csapat adatok sikeresen elmentve! 🛡️");
    } catch (e: any) { alert("Hiba: " + e.message); }
  };

  const handleUploadTeamImage = async (type: 'logo' | 'flag') => {
    if (!teamName) return alert("Nincs beállítva csapatnév a profilodban!");
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return alert("Engedély szükséges!");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.15, base64: true });
      if (!result.canceled && result.assets[0].base64) {
        const imgStr = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (imgStr.length > 1000000) return alert("A kép túl nagy! Kérlek válassz kisebbet.");
        await setDoc(doc(db, "teams", teamName), { [type]: imgStr, name: teamName }, { merge: true });
        if (type === 'logo') setTeamLogo(imgStr);
        if (type === 'flag') setTeamFlag(imgStr);
        alert(`${type === 'logo' ? 'Csapat logó' : 'Csapat zászló'} frissítve!`);
      }
    } catch (e: any) { alert("Hiba: " + e.message); }
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
      Linking.openURL(imageBase64).catch(() => alert('A kép letöltése nem sikerült.'));
    }
  };

  if (!language) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <Image source={require('./logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Válassz nyelvet / Choose language</Text>
          <TouchableOpacity style={styles.outlineButton} onPress={() => setLanguage('hu')}><Text style={styles.outlineButtonText}>Magyar 🇭🇺</Text></TouchableOpacity>
          <TouchableOpacity style={styles.outlineButton} onPress={() => setLanguage('en')}><Text style={styles.outlineButtonText}>English 🇬🇧</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <Image source={require('./logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>{isLoginMode ? 'BEJELENTKEZÉS' : 'REGISZTRÁCIÓ'}</Text>
            <Text style={styles.subtitle}>MMDSZ Diáknapok</Text>

            {!isLoginMode && (
              <>
                <TextInput style={styles.input} placeholder="Teljes név" placeholderTextColor="#888" value={fullName} onChangeText={setFullName} />
                <TextInput style={styles.input} placeholder="Csapat neve" placeholderTextColor="#888" value={teamName} onChangeText={setTeamName} />
              </>
            )}
            <TextInput style={styles.input} placeholder="E-mail cím" placeholderTextColor="#888" keyboardType="email-address" value={email} onChangeText={setEmail} autoCapitalize="none" />
            <View style={styles.passwordContainer}>
              <TextInput style={styles.passwordInput} placeholder="Jelszó" placeholderTextColor="#888" secureTextEntry={securePassword} value={password} onChangeText={setPassword} />
              <TouchableOpacity onPress={() => setSecurePassword(!securePassword)} style={styles.eyeIconContainer}><Text>👁️</Text></TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.solidButton} onPress={isLoginMode ? handleLogin : handleRegister}>
              <Text style={styles.solidButtonText}>{isLoginMode ? 'BELÉPÉS' : 'REGISZTRÁCIÓ'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 25, alignItems: 'center' }} onPress={() => { setIsLoginMode(!isLoginMode); resetForm(); }}>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }}>{isLoginMode ? 'Nincs még fiókod? Regisztrálj!' : 'Már van fiókod? Lépj be!'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoggedIn && !isVerified && userRole !== 'Főszervező') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <View style={styles.card}>
            <Text style={[styles.title, { color: '#F39C12' }]}>⏳ FÜGGŐBEN LÉVŐ REGISZTRÁCIÓ</Text>
            <Text style={[styles.cardText, { textAlign: 'center', marginVertical: 15 }]}>
              A fiókod és a diákigazolványod ellenőrzés alatt áll. Kérjük, várd meg, amíg egy főszervező jóváhagyja a regisztrációdat!
            </Text>
            
            {!hasIgazolas ? (
              <TouchableOpacity style={styles.solidButton} onPress={handleUploadIgazolas}>
                <Text style={styles.solidButtonText}>📸 Diákigazolvány Feltöltése</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: '#27AE60', textAlign: 'center', fontWeight: 'bold', marginBottom: 15 }}>✅ Igazolvány feltöltve. Visszaigazolásra vár.</Text>
            )}

            <TouchableOpacity style={[styles.outlineButton, { marginTop: 10 }]} onPress={handleLogout}>
              <Text style={styles.outlineButtonText}>Kilépés</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === 'profile') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <TouchableOpacity onPress={() => setCurrentView(null)} style={{ marginBottom: 15 }}><Text style={{ color: '#EC2127', fontSize: 16, fontWeight: 'bold' }}>← Vissza a Főoldalra</Text></TouchableOpacity>
          <Text style={styles.title}>👤 SAJÁT PROFIL</Text>
          <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 10 }}>
            <TouchableOpacity onPress={handleUploadProfileImage} style={styles.avatarContainer}>
              {profileImage ? <Image source={{ uri: profileImage }} style={styles.avatar} /> : <Text style={{ fontSize: 35 }}>📷</Text>}
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: '#aaa', marginBottom: 15 }}>Kattints a képre a módosításhoz</Text>
            <View style={styles.profileInfoCard}>
              <Text style={styles.profileLabel}>Név:</Text><Text style={styles.profileValue}>{fullName || 'Nincs megadva'}</Text>
              <Text style={styles.profileLabel}>E-mail:</Text><Text style={styles.profileValue}>{auth.currentUser?.email}</Text>
              <Text style={styles.profileLabel}>Csapat:</Text><Text style={styles.profileValue}>{teamName || 'Egyéni'}</Text>
              <Text style={styles.profileLabel}>Szerepkör:</Text><Text style={[styles.profileValue, { color: '#EC2127' }]}>{userRole}</Text>
              
              <Text style={styles.profileLabel}>Diákigazolvány:</Text>
              <Text style={{ fontWeight: 'bold', color: hasIgazolas ? (isVerified ? '#27AE60' : '#F39C12') : '#EC2127' }}>
                {hasIgazolas ? (isVerified ? '✅ Elfogadva' : '⏳ Ellenőrzés alatt') : '❌ Nincs feltöltve'}
              </Text>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === 'allTeams') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setCurrentView(null)}><Text style={{ color: '#EC2127', fontSize: 16, fontWeight: 'bold' }}>← Vissza</Text></TouchableOpacity>
            <TouchableOpacity onPress={fetchAllTeams}><Text style={{ color: '#27AE60', fontSize: 15, fontWeight: 'bold' }}>🔄 Frissítés</Text></TouchableOpacity>
          </View>
          <Text style={[styles.title, { marginTop: 15, color: '#EC2127' }]}>🛡️ CSAPATOK TÁBORA</Text>
          <Text style={styles.subtitle}>Kattints a logóra a csapat videójáért!</Text>

          <ScrollView style={{ width: '100%', marginTop: 10 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {allTeams.length === 0 ? (
                <Text style={{ textAlign: 'center', width: '100%', color: '#888', marginTop: 20 }}>Még nincsenek feltöltött csapatok.</Text>
              ) : (
                allTeams.map((team, idx) => (
                  <View key={idx} style={styles.teamGridCard}>
                    <View style={styles.logoWithBubbles}>
                      <TouchableOpacity 
                        style={styles.teamLogoCircle} 
                        onPress={() => {
                          if (team.videoLink) Linking.openURL(team.videoLink).catch(() => alert('Hiba a link megnyitásakor.'));
                          else alert('Ez a csapat még nem töltött fel bemutatkozó videót!');
                        }}
                      >
                        {team.logo ? <Image source={{ uri: team.logo }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ fontSize: 30 }}>⛺</Text>}
                      </TouchableOpacity>
                      <View style={[styles.sponsorBubble, { top: -5, left: -5 }]}><Text style={{ fontSize: 10 }}>⭐</Text></View>
                      <View style={[styles.sponsorBubble, { top: -5, right: -5 }]}><Text style={{ fontSize: 10 }}>💸</Text></View>
                      <View style={[styles.sponsorBubble, { bottom: -5, left: -5 }]}><Text style={{ fontSize: 10 }}>⚡</Text></View>
                    </View>
                    <Text style={styles.teamGridName}>{team.name || 'Névtelen Csapat'}</Text>
                    <Text style={styles.teamGridDesc} numberOfLines={2}>{team.description || 'Nincs leírás'}</Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === 'teamManagement') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setCurrentView(null)}><Text style={{ color: '#EC2127', fontSize: 16, fontWeight: 'bold' }}>← Vissza</Text></TouchableOpacity>
            <TouchableOpacity onPress={fetchTeamData}><Text style={{ color: '#27AE60', fontSize: 15, fontWeight: 'bold' }}>🔄 Frissítés</Text></TouchableOpacity>
          </View>
          <Text style={[styles.title, { marginTop: 15, color: '#EC2127' }]}>🛡️ {teamName ? teamName.toUpperCase() : 'CSAPAT'} KEZELÉSE</Text>
          <Text style={styles.subtitle}>Csapatkapitányi felület</Text>
          
          <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
              <View style={{ alignItems: 'center', width: '48%' }}>
                <Text style={styles.cardTitle}>Csapat Logó</Text>
                <TouchableOpacity onPress={() => handleUploadTeamImage('logo')} style={[styles.imagePlaceholder, { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1E1E1E', borderWidth: 2, borderColor: '#333' }]}>
                  {teamLogo ? <Image source={{ uri: teamLogo }} style={{ width: '100%', height: '100%', borderRadius: 50 }} /> : <Text style={{ color: '#aaa', fontSize: 24 }}>📷</Text>}
                </TouchableOpacity>
              </View>
              <View style={{ alignItems: 'center', width: '48%' }}>
                <Text style={styles.cardTitle}>Csapat Zászló</Text>
                <TouchableOpacity onPress={() => handleUploadTeamImage('flag')} style={[styles.imagePlaceholder, { width: 120, height: 80, backgroundColor: '#1E1E1E', borderWidth: 2, borderColor: '#333', borderRadius: 8 }]}>
                  {teamFlag ? <Image source={{ uri: teamFlag }} style={{ width: '100%', height: '100%', borderRadius: 8 }} /> : <Text style={{ color: '#aaa', fontSize: 24 }}>🚩</Text>}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Csapat Leírása</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Írd le a csapatot pár mondatban..." placeholderTextColor="#888" multiline value={teamDescription} onChangeText={setTeamDescription} />
              
              <Text style={[styles.cardTitle, { marginTop: 10 }]}>Bemutatkozó Videó Link</Text>
              <TextInput style={styles.input} placeholder="https://..." placeholderTextColor="#888" value={teamVideoLink} onChangeText={setTeamVideoLink} />
              <TouchableOpacity style={styles.solidButton} onPress={handleSaveTeamData}><Text style={styles.solidButtonText}>Mentés</Text></TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>✉️ Csapattag Meghívása E-mailen</Text>
              <Text style={styles.cardText}>Add meg a tag e-mail címét, és válaszd ki a szerepkörét:</Text>
              
              <TextInput 
                style={[styles.input, { marginTop: 8 }]} 
                placeholder="tag@email.com" 
                placeholderTextColor="#888" 
                keyboardType="email-address"
                value={inviteEmail} 
                onChangeText={setInviteEmail} 
                autoCapitalize="none"
              />

              <Text style={[styles.profileLabel, { marginBottom: 6 }]}>Szerepkör kiválasztása:</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <TouchableOpacity 
                  style={[styles.filterChip, inviteRole === 'Csapattag' && styles.filterChipActive, { flex: 1, marginRight: 5 }]} 
                  onPress={() => setInviteRole('Csapattag')}
                >
                  <Text style={[styles.filterChipText, inviteRole === 'Csapattag' && styles.filterChipTextActive]}>Csapattag</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.filterChip, inviteRole === 'Alcsapatkapitány' && styles.filterChipActive, { flex: 1, marginLeft: 5 }]} 
                  onPress={() => setInviteRole('Alcsapatkapitány')}
                >
                  <Text style={[styles.filterChipText, inviteRole === 'Alcsapatkapitány' && styles.filterChipTextActive]}>Alcsapatkapitány</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.solidButton, { backgroundColor: '#27AE60' }]} onPress={handleSendTeamInvite}>
                <Text style={styles.solidButtonText}>Meghívó E-mail Küldése</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedGalleryImage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <TouchableOpacity onPress={() => setSelectedGalleryImage(null)} style={{ marginBottom: 15 }}>
            <Text style={{ color: '#EC2127', fontSize: 16, fontWeight: 'bold' }}>← Vissza a mappába</Text>
          </TouchableOpacity>
          <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            <Image source={{ uri: selectedGalleryImage.image }} style={styles.fullScreenImage} resizeMode="contain" />
            <Text style={{ color: '#aaa', marginTop: 10, fontSize: 13 }}>Feltöltötte: {selectedGalleryImage.uploadedBy}</Text>
            
            <TouchableOpacity 
              style={[styles.solidButton, { width: '100%', marginTop: 20 }]} 
              onPress={() => handleDownloadImage(selectedGalleryImage.image)}
            >
              <Text style={styles.solidButtonText}>📥 Letöltés</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === 'gallery') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => { if (selectedGalleryFolder) setSelectedGalleryFolder(null); else setCurrentView(null); }}>
              <Text style={{ color: '#EC2127', fontSize: 16, fontWeight: 'bold' }}>← Vissza</Text>
            </TouchableOpacity>
            {selectedGalleryFolder && (
              <TouchableOpacity onPress={() => fetchGallery(selectedGalleryFolder)}>
                <Text style={{ color: '#27AE60', fontSize: 15, fontWeight: 'bold' }}>🔄 Frissítés</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={[styles.title, { marginTop: 15 }]}>
            {selectedGalleryFolder ? `📁 ${selectedGalleryFolder}` : '📸 KÖZÖSSÉGI GALÉRIA'}
          </Text>
          <Text style={styles.subtitle}>
            {selectedGalleryFolder ? 'Kattints bármelyik képre a letöltéshez' : 'Válassz egy mappát a megtekintéshez'}
          </Text>

          {!selectedGalleryFolder ? (
            <ScrollView style={{ width: '100%', marginTop: 10 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {GALLERY_FOLDERS.map((folder) => (
                  <TouchableOpacity 
                    key={folder.id} 
                    style={styles.folderCard} 
                    onPress={() => { setSelectedGalleryFolder(folder.id); fetchGallery(folder.id); }}
                  >
                    <Text style={{ fontSize: 36, marginBottom: 8 }}>{folder.icon}</Text>
                    <Text style={styles.folderName}>{folder.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <>
              <TouchableOpacity style={[styles.solidButton, { marginBottom: 15 }]} onPress={() => handleUploadGalleryImage(selectedGalleryFolder)}>
                <Text style={styles.solidButtonText}>+ Kép feltöltése ide: {selectedGalleryFolder}</Text>
              </TouchableOpacity>

              <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                {galleryImages.length === 0 ? (
                  <Text style={{ textAlign: 'center', marginTop: 30, color: '#888' }}>Még nincsenek képek ebben a mappában.</Text>
                ) : (
                  galleryImages.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.galleryCard} onPress={() => setSelectedGalleryImage(item)}>
                      <Image source={{ uri: item.image }} style={styles.galleryImage} resizeMode="cover" />
                      <Text style={styles.galleryAuthor}>Feltöltötte: {item.uploadedBy} (Kattints a megnyitáshoz)</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === 'map') {
    const mapHtml = `<!DOCTYPE html><html><head><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>body { margin: 0; padding: 0; background: #121212; }</style></head><body><div id="map" style="width: 100vw; height: 100vh;"></div><script>var map = L.map('map').setView([46.5435, 24.5772], 15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);var points = ${JSON.stringify(mapPoints)};points.forEach(function(p) { L.marker([p.lat, p.lng]).addTo(map).bindPopup('<b>' + p.title + '</b><br>' + p.description); });</script></body></html>`;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setCurrentView(null)}><Text style={{ color: '#EC2127', fontSize: 16, fontWeight: 'bold' }}>← Vissza</Text></TouchableOpacity>
            <TouchableOpacity onPress={fetchMapPoints}><Text style={{ color: '#27AE60', fontSize: 15, fontWeight: 'bold' }}>🔄 Frissítés</Text></TouchableOpacity>
          </View>
          <Text style={[styles.title, { marginTop: 10 }]}>🗺️ ÉLŐ TÉRKÉP</Text>
          <View style={styles.mapCard}>
            {Platform.OS === 'web' ? <iframe width="100%" height="380" style={{ border: 0, borderRadius: 10 }} srcDoc={mapHtml} /> : 
              <ScrollView style={{ padding: 15, maxHeight: 380 }}>{mapPoints.map((p, idx) => (<View key={idx} style={{ marginBottom: 12, padding: 10, backgroundColor: '#1E1E1E', borderRadius: 8 }}><Text style={{ fontWeight: 'bold', color: '#EC2127' }}>📍 {p.title}</Text><Text style={{ fontSize: 13, color: '#ccc' }}>{p.description}</Text></View>))}</ScrollView>
            }
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedProgram) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <TouchableOpacity onPress={() => setSelectedProgram(null)} style={{ marginBottom: 15 }}>
            <Text style={{ color: '#EC2127', fontSize: 16, fontWeight: 'bold' }}>← Vissza a programokhoz</Text>
          </TouchableOpacity>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { textAlign: 'left', marginBottom: 10 }]}>{selectedProgram.title}</Text>
            <View style={[styles.timeBadgeContainer, { alignSelf: 'flex-start', marginBottom: 10 }]}><Text style={styles.timeText}>{selectedProgram.time}</Text></View>
            <Text style={styles.programDetail}>📍 {selectedProgram.helyszín || 'Helyszín hamarosan'} | {selectedProgram.day}</Text>
            
            {selectedProgram.image ? (
              <Image source={{ uri: selectedProgram.image }} style={{ width: '100%', height: 220, borderRadius: 10, marginVertical: 15 }} resizeMode="cover" />
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Részletes leírás</Text>
              <Text style={styles.cardText}>{selectedProgram.description || 'Ehhez a programhoz még nem került feltöltésre leírás.'}</Text>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === 'schedule') {
    const filteredPrograms = programs.filter(item => item.day === selectedCategory);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setCurrentView(null)}><Text style={{ color: '#EC2127', fontSize: 16, fontWeight: 'bold' }}>← Vissza</Text></TouchableOpacity>
            <TouchableOpacity onPress={fetchPrograms}><Text style={{ color: '#27AE60', fontSize: 15, fontWeight: 'bold' }}>🔄 Frissítés</Text></TouchableOpacity>
          </View>
          <Text style={[styles.title, { marginTop: 15, textAlign: 'left' }]}>📅 PROGRAMFÜZET</Text>
          
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
              {['Szerda', 'Csütörtök', 'Péntek', 'Szombat'].map((cat) => (
                <TouchableOpacity key={cat} style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]} onPress={() => setSelectedCategory(cat)}>
                  <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={{ width: '100%', marginTop: 5 }} showsVerticalScrollIndicator={false}>
            {filteredPrograms.length === 0 ? <Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>Nincs program erre a napra.</Text> : 
              filteredPrograms.map((item) => (
                <TouchableOpacity key={item.id} style={styles.programCard} onPress={() => setSelectedProgram(item)}>
                  <View style={styles.timeBadgeContainer}>
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>
                  <Text style={styles.programDetail}>📍 {item.helyszín || 'Helyszín hamarosan'}</Text>
                  <Text style={styles.programTitle}>{item.title}</Text>
                </TouchableOpacity>
              ))
            }
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === 'photohunt') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setCurrentView(null)}><Text style={{ color: '#EC2127', fontWeight: 'bold' }}>← Vissza</Text></TouchableOpacity>
            <TouchableOpacity onPress={fetchPhotoHuntProgress}><Text style={{ color: '#27AE60', fontWeight: 'bold' }}>🔄 Frissítés</Text></TouchableOpacity>
          </View>
          <Text style={[styles.title, { marginTop: 15 }]}>📷 PHOTO HUNT</Text>
          <Text style={styles.subtitle}>Minden fotón/videón legalább 2 csapattag szerepeljen!</Text>
          <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
            {PHOTO_HUNT_TASKS.map((task) => (
              <View key={task.id} style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}><Text style={styles.cardTitle}>{task.title}</Text><Text style={styles.cardText}>Kritérium: {task.criteria}</Text></View>
                  {photoHuntProgress[task.id] ? <Text style={{ fontSize: 24 }}>✅</Text> : <TouchableOpacity style={[styles.outlineButton, { marginBottom: 0, paddingVertical: 8, paddingHorizontal: 12 }]} onPress={() => handleUploadPhotoHunt(task.id)}><Text style={styles.outlineButtonText}>Feltöltés</Text></TouchableOpacity>}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === 'usersList') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setCurrentView(null)}><Text style={{ color: '#EC2127', fontSize: 16, fontWeight: 'bold' }}>← Vissza</Text></TouchableOpacity>
            <TouchableOpacity onPress={fetchRegisteredUsers}><Text style={{ color: '#27AE60', fontSize: 15, fontWeight: 'bold' }}>🔄 Frissítés</Text></TouchableOpacity>
          </View>
          <Text style={[styles.title, { marginTop: 15 }]}>👥 REGISZTRÁLTAK</Text>
          <ScrollView style={{ width: '100%', marginTop: 10 }}>
            {registeredUsers.map((user) => (
              <View key={user.id} style={styles.userCard}><Text style={styles.userName}>👤 {user.name}</Text><Text style={styles.userRole}>Szerepkör: {user.role}</Text><Text style={{ marginTop: 4, fontWeight: 'bold', color: user.igazolas ? '#27AE60' : '#EC2127' }}>{user.igazolas ? '✅ Igazolás feltöltve' : '❌ Nincs igazolás'}</Text></View>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === 'adminDashboard') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setCurrentView(null)}>
              <Text style={{ color: '#EC2127', fontSize: 16, fontWeight: 'bold' }}>← Vissza</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.title, { marginTop: 15, color: '#EC2127' }]}>⚙️ ADMIN VEZÉRLŐPULT</Text>
          
          <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
            
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📅 Új program hozzáadása</Text>
              
              <Text style={styles.profileLabel}>Válassz napot:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, marginTop: 5 }}>
                {['Szerda', 'Csütörtök', 'Péntek', 'Szombat'].map((day) => (
                  <TouchableOpacity 
                    key={day} 
                    style={[styles.filterChip, adminEventDay === day && styles.filterChipActive, { marginBottom: 6 }]} 
                    onPress={() => setAdminEventDay(day)}
                  >
                    <Text style={[styles.filterChipText, adminEventDay === day && styles.filterChipTextActive]}>{day}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput style={styles.input} placeholder="Program neve (pl. Koncert)" placeholderTextColor="#888" value={adminEventTitle} onChangeText={setAdminEventTitle} />
              <TextInput style={styles.input} placeholder="Időpont (pl. 20:00)" placeholderTextColor="#888" value={adminEventTime} onChangeText={setAdminEventTime} />
              <TextInput style={styles.input} placeholder="Helyszín (pl. Nagyszínpad)" placeholderTextColor="#888" value={adminEventLocation} onChangeText={setAdminEventLocation} />
              
              <TouchableOpacity style={[styles.solidButton, { opacity: isUploading ? 0.7 : 1 }]} onPress={handleAddAdminEvent} disabled={isUploading}>
                <Text style={styles.solidButtonText}>{isUploading ? 'Feltöltés folyamatban...' : 'Program Mentése'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📯 Push Értesítés Küldése</Text>
              <TextInput style={styles.input} placeholder="Értesítés címe" placeholderTextColor="#888" value={notifTitle} onChangeText={setNotifTitle} />
              <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} placeholder="Értesítés szövege..." placeholderTextColor="#888" multiline value={notifBody} onChangeText={setNotifBody} />
              <TouchableOpacity style={styles.solidButton} onPress={handleSendNotification}>
                <Text style={styles.solidButtonText}>Értesítés Kiküldése</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎓 Diákigazolványok Ellenőrzése</Text>
              <TouchableOpacity style={styles.outlineButton} onPress={fetchPendingUsers}>
                <Text style={styles.outlineButtonText}>🔄 Feltöltött igazolványok listázása</Text>
              </TouchableOpacity>

              {showPending && (
                <View style={{ marginTop: 10 }}>
                  {pendingUsers.length === 0 ? (
                    <Text style={{ color: '#888', textAlign: 'center', marginTop: 10 }}>Még nincsenek feltöltött igazolványok.</Text>
                  ) : (
                    pendingUsers.map(user => (
                      <View key={user.id} style={{ backgroundColor: '#121212', padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#333' }}>
                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{user.name} ({user.email})</Text>
                        <Text style={{ color: '#aaa', fontSize: 12, marginBottom: 5 }}>Csapat: {user.team || 'Egyéni'}</Text>
                        <Text style={{ color: user.isVerified ? '#27AE60' : '#F39C12', fontSize: 12, fontWeight: 'bold', marginBottom: 10 }}>
                          Státusz: {user.isVerified ? '✅ Elfogadva' : '⏳ Függőben'}
                        </Text>
                        
                        <Image source={{ uri: user.igazolas }} style={{ width: '100%', height: 150, borderRadius: 8, marginBottom: 10 }} resizeMode="contain" />
                        
                        {!user.isVerified && (
                          <TouchableOpacity style={[styles.solidButton, { backgroundColor: '#27AE60' }]} onPress={() => handleApproveId(user.id)}>
                            <Text style={styles.solidButtonText}>✅ Jóváhagyás (Engedélyezés)</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>

          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>MMDSZ DIÁKNAPOK ⛺</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setCurrentView('profile')} style={{ marginRight: 15 }}><Text style={{ color: '#EC2127', fontWeight: 'bold' }}>Profil</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleLogout}><Text style={{ color: '#888', fontWeight: 'bold' }}>Kilépés</Text></TouchableOpacity>
            </View>
          </View>
          <Text style={styles.subtitle}>Bejelentkezve mint: <Text style={{ fontWeight: 'bold', color: '#EC2127' }}>{userRole}</Text></Text>

          <View style={styles.countdownCard}>
            <Text style={styles.countdownTitle}>🎉 28. MAROSVÁSÁRHELYI DIÁKNAPOK</Text>
            <Text style={styles.countdownSub}>2027. május 20–24.</Text>
            <View style={styles.timerRow}>
              <View style={styles.timeBox}><Text style={styles.timeVal}>{timeLeft.days}</Text><Text style={styles.timeLbl}>Nap</Text></View>
              <View style={styles.timeBox}><Text style={styles.timeVal}>{timeLeft.hours}</Text><Text style={styles.timeLbl}>Óra</Text></View>
              <View style={styles.timeBox}><Text style={styles.timeVal}>{timeLeft.minutes}</Text><Text style={styles.timeLbl}>Perc</Text></View>
            </View>
          </View>

          <View style={styles.newsCard}>
            <Text style={styles.newsBadge}>🚩 Szerda 17:00</Text><Text style={styles.cardTitle}>Hagyományos Felvonulás</Text><Text style={styles.cardText}>Indulás a Főtérről a Víkendtelepre! Öltözzetek csapatpólóba.</Text><Image source={require('./felvonulas.png')} style={styles.bandImage} resizeMode="cover" />
          </View>
          <View style={styles.newsCard}>
            <Text style={[styles.newsBadge, { backgroundColor: '#27AE60' }]}>🎸 Csütörtök 21:00</Text><Text style={styles.cardTitle}>Döntő Duo Élő Koncert</Text><Text style={styles.cardText}>A fergeteges hangulat garantált a nagyszínpadon!</Text><Image source={require('./dondi.png')} style={styles.bandImage} resizeMode="cover" />
          </View>

          {showIgazolasUpload && (
            <View style={[styles.card, { alignItems: 'center' }]}>
              <Text style={styles.cardTitle}>🎓 Diákigazolvány</Text>
              {hasIgazolas ? (
                <Text style={{ color: isVerified ? '#27AE60' : '#F39C12', fontWeight: 'bold', marginTop: 5 }}>
                  {isVerified ? '✅ Elfogadva' : '⏳ Ellenőrzés alatt...'}
                </Text>
              ) : (
                <TouchableOpacity style={styles.outlineButton} onPress={handleUploadIgazolas}>
                  <Text style={styles.outlineButtonText}>📸 Fénykép kiválasztása</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.menuGrid}>
            <TouchableOpacity style={styles.menuButton} onPress={() => { fetchPrograms(); setCurrentView('schedule'); }}>
              <Text style={styles.menuIcon}>📅</Text><Text style={styles.menuText}>Programok</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuButton} onPress={() => { fetchAllTeams(); setCurrentView('allTeams'); }}>
              <Text style={styles.menuIcon}>🛡️</Text><Text style={styles.menuText}>Csapatok</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuButton} onPress={() => { fetchMapPoints(); setCurrentView('map'); }}>
              <Text style={styles.menuIcon}>🗺️</Text><Text style={styles.menuText}>Térkép</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuButton} onPress={() => { setSelectedGalleryFolder(null); setCurrentView('gallery'); }}>
              <Text style={styles.menuIcon}>📸</Text><Text style={styles.menuText}>Galéria</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuButton} onPress={() => { fetchPhotoHuntProgress(); setCurrentView('photohunt'); }}>
              <Text style={styles.menuIcon}>📷</Text><Text style={styles.menuText}>Photo Hunt</Text>
            </TouchableOpacity>
            
            {isCaptainOrDeputy && (
              <TouchableOpacity style={styles.menuButton} onPress={() => { fetchTeamData(); setCurrentView('teamManagement'); }}>
                <Text style={styles.menuIcon}>⚙️</Text><Text style={styles.menuText}>Csapatkezelés</Text>
              </TouchableOpacity>
            )}

            {isOrganizerOrHead && (
              <TouchableOpacity style={styles.menuButton} onPress={() => { fetchRegisteredUsers(); setCurrentView('usersList'); }}>
                <Text style={styles.menuIcon}>👥</Text><Text style={styles.menuText}>Regisztráltak</Text>
              </TouchableOpacity>
            )}

            {userRole === 'Főszervező' && (
              <TouchableOpacity style={styles.menuButton} onPress={() => setCurrentView('adminDashboard')}>
                <Text style={styles.menuIcon}>⚙️</Text><Text style={styles.menuText}>Admin Pult</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 450, flex: 1, padding: 20, justifyContent: 'center' },
  scrollContainer: { flexGrow: 1, paddingVertical: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logo: { width: 100, height: 100, marginBottom: 16, alignSelf: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center', letterSpacing: 1 },
  subtitle: { fontSize: 13, color: '#aaa', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#1E1E1E', color: '#FFF' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#333', borderRadius: 8, marginBottom: 12, backgroundColor: '#1E1E1E' },
  passwordInput: { flex: 1, padding: 12, color: '#FFF' },
  eyeIconContainer: { paddingHorizontal: 12 },
  outlineButton: { borderWidth: 2, borderColor: '#EC2127', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center', marginBottom: 14, backgroundColor: '#1E1E1E' },
  outlineButtonText: { color: '#FFF', fontWeight: 'bold' },
  solidButton: { backgroundColor: '#EC2127', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  solidButtonText: { color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
  card: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  cardText: { fontSize: 14, color: '#aaa', lineHeight: 20 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
  menuButton: { width: '48%', backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 15 },
  menuIcon: { fontSize: 28, marginBottom: 8 },
  menuText: { color: '#FFF', fontWeight: 'bold' },
  userCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 14, marginBottom: 10 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  userRole: { fontSize: 14, color: '#aaa' },
  
  programCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 14, marginBottom: 12 },
  timeBadgeContainer: { alignSelf: 'flex-start', backgroundColor: '#EC2127', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 6, alignItems: 'center', justifyContent: 'center' },
  timeText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  programTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginTop: 4 },
  programDetail: { fontSize: 13, color: '#aaa', marginBottom: 4 },

  filterContainer: { height: 45, marginVertical: 8, justifyContent: 'center' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 20, marginRight: 8, height: 36, justifyContent: 'center', alignItems: 'center' },
  filterChipActive: { backgroundColor: '#EC2127', borderColor: '#EC2127' },
  filterChipText: { fontSize: 13, color: '#aaa', fontWeight: 'bold' },
  filterChipTextActive: { color: '#FFF' },

  folderCard: { width: '48%', backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 15 },
  folderName: { color: '#FFF', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },

  mapCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, overflow: 'hidden' },
  countdownCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 15 },
  countdownTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold', letterSpacing: 0.5 },
  countdownSub: { color: '#aaa', fontSize: 13, marginBottom: 10 },
  timerRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  timeBox: { backgroundColor: '#121212', borderRadius: 8, padding: 8, width: '30%', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  timeVal: { color: '#EC2127', fontSize: 18, fontWeight: 'bold' },
  timeLbl: { color: '#FFF', fontSize: 11 },
  newsCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15 },
  newsBadge: { alignSelf: 'flex-start', backgroundColor: '#EC2127', color: '#FFF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  bandImage: { width: '100%', height: 180, borderRadius: 8, marginTop: 10 },
  avatarContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#EC2127', overflow: 'hidden', marginBottom: 5 },
  avatar: { width: '100%', height: '100%' },
  profileInfoCard: { width: '100%', backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginTop: 10 },
  profileLabel: { fontSize: 12, color: '#aaa', marginTop: 8 },
  profileValue: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  galleryCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, marginBottom: 15, overflow: 'hidden', paddingBottom: 10 },
  galleryImage: { width: '100%', height: 220 },
  galleryAuthor: { color: '#aaa', fontSize: 12, paddingHorizontal: 12, marginTop: 8 },
  fullScreenImage: { width: '100%', height: 350, borderRadius: 10 },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center', marginTop: 10, overflow: 'hidden' },

  teamGridCard: { width: '48%', backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 15 },
  logoWithBubbles: { position: 'relative', width: 80, height: 80, marginBottom: 10 },
  teamLogoCircle: { width: '100%', height: '100%', borderRadius: 40, backgroundColor: '#121212', borderWidth: 2, borderColor: '#EC2127', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  sponsorBubble: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EC2127', elevation: 3 },
  teamGridName: { color: '#FFF', fontWeight: 'bold', fontSize: 14, textAlign: 'center', marginBottom: 4 },
  teamGridDesc: { color: '#aaa', fontSize: 11, textAlign: 'center' }
});