import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth, db, functions } from '@/src/config/firebase';
import {
  type AccountStatus,
  type AuthState,
  type MembershipStatus,
  type RegistrationInput,
  type UserProfile,
  UserRole,
} from '@/src/types/auth';

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
  resendVerificationEmail: () => Promise<void>;
  confirmEmailAndRedeem: () => Promise<InviteRedemptionResult>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

export type InviteRedemptionResult = 'none' | 'unverified' | { status: 'accepted'; team: string };

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isUserRole(value: unknown): value is UserRole {
  return Object.values(UserRole).some((role) => role === value);
}

async function redeemPendingInvite(user: User): Promise<InviteRedemptionResult> {
  if (!user.emailVerified || !user.email) return 'unverified';

  const redeemInvite = httpsCallable<
    { name: string },
    { status: 'none' } | { status: 'accepted'; team: string }
  >(functions, 'redeemInvite');
  const result = await redeemInvite({ name: user.displayName ?? '' });
  if (result.data.status === 'none') return 'none';
  if (result.data.status === 'accepted' && typeof result.data.team === 'string') {
    return { status: 'accepted', team: result.data.team };
  }
  throw new Error('Invalid invitation redemption response');
}

function isAccountStatus(value: unknown): value is AccountStatus {
  return [
    'pending_captain_approval',
    'pending_verification',
    'pending_admin_approval',
    'pending_admin_activation',
    'active',
    'rejected',
    'disabled',
  ].includes(value as string);
}

function isMembershipStatus(value: unknown): value is MembershipStatus {
  return [
    'pending_captain_approval',
    'pending_verification',
    'pending_admin_approval',
    'pending_admin_activation',
    'active',
    'rejected',
  ].includes(value as string);
}

function toUserProfile(user: User, data: Record<string, unknown>): UserProfile {
  const rawRole = data.role as string;
  const resolvedRole: UserRole = Object.values(UserRole).includes(rawRole as UserRole)
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
    accountStatus: isAccountStatus(data.accountStatus) ? data.accountStatus : undefined,
    membershipStatus: isMembershipStatus(data.membershipStatus) ? data.membershipStatus : undefined,
    pendingRole: isUserRole(data.pendingRole) ? data.pendingRole : undefined,
    requestedTeamName: typeof data.requestedTeamName === 'string' ? data.requestedTeamName : undefined,
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

      if (user.emailVerified) {
        void redeemPendingInvite(user).catch((error: unknown) => {
          console.error('Failed to redeem pending invitation on sign-in', error);
        });
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
    register: async ({ name, email, password, team, registrationCode }) => {
      const normalizedEmail = email.trim().toLowerCase();
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      await updateProfile(userCredential.user, { displayName: name.trim() });
      // Szerepkört és csapattagságot csak a Firebase Functions állíthat be:
      // a kliensből érkező role/team adat nem adhat jogosultságot.
      if (registrationCode?.trim()) {
        const requestCaptainRegistration = httpsCallable<
          { code: string; name: string; teamName: string },
          { status: string }
        >(functions, 'requestCaptainRegistration');
        await requestCaptainRegistration({
          code: registrationCode.trim(),
          name: name.trim(),
          teamName: team?.trim() ?? '',
        });
      }
      await sendEmailVerification(userCredential.user);
    },
    resendVerificationEmail: async () => {
      const user = auth.currentUser;
      if (!user?.email) throw new Error('The signed-in user has no email address');
      await sendEmailVerification(user);
    },
    confirmEmailAndRedeem: async () => {
      const user = auth.currentUser;
      if (!user?.email) return 'unverified';

      await user.reload();
      await user.getIdToken(true);
      setAuthState((current) => (
        current.user?.uid === user.uid ? { ...current, user } : current
      ));
      if (!user.emailVerified) return 'unverified';
      return redeemPendingInvite(user);
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
