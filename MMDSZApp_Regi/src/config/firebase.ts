import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyAXrpkSdAD3aqiyViv_AUMxH6OTSiMI1Zk',
  authDomain: 'allamvizsga-47738.firebaseapp.com',
  projectId: 'allamvizsga-47738',
  storageBucket: 'allamvizsga-47738.firebasestorage.app',
  messagingSenderId: '100668962875',
  appId: '1:100668962875:web:f0472077febd029a64841e',
};

const app = initializeApp(firebaseConfig);

const auth = Platform.OS === 'web' 
  ? getAuth(app) 
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });

const db = getFirestore(app);

export { auth, db };