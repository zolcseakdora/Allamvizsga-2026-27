import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth, db } from '@/src/config/firebase';
import { AuthState, RegistrationInput, UserProfile, UserRole } from '@/src/types/auth';

const initialAuthState: AuthState = {
  user: null,
  profile: null,
  status: 'loading',
};

type AuthContextValue = AuthState & {
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegistrationInput) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUserProfile(user: User, data: Record<string, unknown>): UserProfile {
  const rawRole = data.role as string;
  const resolvedRole: UserRole = user.email === 'dorazolcseak@gmail.com'
    ? UserRole.FOSZERVEZO
    : Object.values(UserRole).includes(rawRole as UserRole)
      ? (rawRole as UserRole)
      : UserRole.CSAPATTAG;

  return {
    name: typeof data.name === 'string' ? data.name : '',
    email: typeof data.email === 'string' ? data.email : user.email ?? '',
    team: typeof data.team === 'string' ? data.team : '',
    role: resolvedRole,
    igazolas: typeof data.igazolas === 'string' ? data.igazolas : undefined,
    isVerified: data.isVerified === true,
    profileImage: typeof data.profileImage === 'string' ? data.profileImage : null,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;

      if (!user) {
        setAuthState({ user: null, profile: null, status: 'unauthenticated' });
        return;
      }

      unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
        const profile = snapshot.exists() ? toUserProfile(user, snapshot.data()) : null;
        setAuthState({ user, profile, status: 'authenticated' });
      });
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const value: AuthContextValue = {
    ...authState,
    isLoggedIn: authState.status === 'authenticated',
    isLoading: authState.status === 'loading',
    login: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    register: async ({ name, email, password, team }) => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name,
        email,
        team: team || 'Egyéni',
        role: UserRole.CSAPATTAG,
        createdAt: new Date(),
        isVerified: false,
      });
    },
    resetPassword: async (email) => {
      await sendPasswordResetEmail(auth, email);
    },
    logout: async () => {
      await AsyncStorage.clear();
      await signOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}