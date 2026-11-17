import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth, db } from '@/src/config/firebase';
import { AuthState, RegistrationInput, UserProfile, UserRole } from '@/src/types/auth';
import { normalizeTeamName, teamNameKey } from '@/src/utils/team-name';
import type { EventSeason } from '@/src/constants/event-schedule';

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
  registerForEvent: (eventType: EventSeason, teamName: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  confirmEmailAndRedeem: () => Promise<InviteRedemptionResult>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

export type InviteRedemptionResult = 'none' | 'unverified' | {
  status: 'accepted';
  team?: string;
  eventType?: 'februtalis';
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isUserRole(value: unknown): value is UserRole {
  return Object.values(UserRole).some((role) => role === value);
}

async function redeemPendingInvite(user: User): Promise<InviteRedemptionResult> {
  if (!user.emailVerified || !user.email) return 'unverified';

  const email = user.email.toLowerCase();
  const inviteRef = doc(db, 'invites', email);
  const inviteSnapshot = await getDoc(inviteRef);
  if (!inviteSnapshot.exists() || inviteSnapshot.data().status !== 'Függőben') {
    return 'none';
  }

  const invite = inviteSnapshot.data();
  if (!isUserRole(invite.role)) {
    throw new Error(`Invalid invite document for ${email}`);
  }

  if (invite.eventType === 'februtalis') {
    if (invite.role !== UserRole.SZERVEZO && invite.role !== UserRole.ZSURI) {
      throw new Error(`Invalid Februtális invite role for ${email}`);
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.uid), {
      'eventMemberships.februtalis': { role: invite.role },
    });
    batch.update(inviteRef, { status: 'Elfogadva' });
    await batch.commit();
    return { status: 'accepted', eventType: 'februtalis' };
  }

  if (typeof invite.team !== 'string') {
    throw new Error(`Invalid invite document for ${email}`);
  }
  const team = normalizeTeamName(invite.team);
  if (!team) throw new Error(`Invalid team name in invite document for ${email}`);

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', user.uid), {
    role: invite.role,
    team,
  });
  batch.update(inviteRef, { status: 'Elfogadva' });
  await batch.commit();
  return { status: 'accepted', team };
}

function toUserProfile(user: User, data: Record<string, unknown>): UserProfile {
  const rawRole = data.role as string;
  const resolvedRole: UserRole = Object.values(UserRole).includes(rawRole as UserRole)
    ? (rawRole as UserRole)
    : UserRole.CSAPATTAG;

  const rawMemberships = data.eventMemberships;
  const eventMemberships: UserProfile['eventMemberships'] = {};
  if (rawMemberships && typeof rawMemberships === 'object') {
    for (const eventType of ['februtalis', 'diaknapok'] as const) {
      const membership = (rawMemberships as Record<string, unknown>)[eventType];
      if (!membership || typeof membership !== 'object') continue;
      const value = membership as Record<string, unknown>;
      if (Object.values(UserRole).some((role) => role === value.role)
        && (value.teamId === undefined || typeof value.teamId === 'string')) {
        eventMemberships[eventType] = {
          ...(typeof value.teamId === 'string' ? { teamId: value.teamId } : {}),
          role: value.role as UserRole,
        };
      }
    }
  }

  const rawVerifications = data.eventVerifications;
  const eventVerifications: UserProfile['eventVerifications'] = {};
  if (rawVerifications && typeof rawVerifications === 'object') {
    for (const eventType of ['februtalis', 'diaknapok'] as const) {
      const verification = (rawVerifications as Record<string, unknown>)[eventType];
      if (!verification || typeof verification !== 'object') continue;
      const value = verification as Record<string, unknown>;
      if (
        typeof value.imageUrl === 'string'
        && (value.status === 'pending' || value.status === 'approved')
      ) {
        eventVerifications[eventType] = {
          imageUrl: value.imageUrl,
          status: value.status,
          ...(value.uploadedAt ? { uploadedAt: value.uploadedAt } : {}),
        };
      }
    }
  }

  return {
    name: typeof data.name === 'string' ? data.name : '',
    email: typeof data.email === 'string' ? data.email : user.email ?? '',
    team: typeof data.team === 'string' ? data.team : '',
    role: resolvedRole,
    igazolas: typeof data.igazolas === 'string' ? data.igazolas : undefined,
    ...(Object.keys(eventVerifications).length > 0 ? { eventVerifications } : {}),
    isVerified: data.isVerified === true,
    profileImage: typeof data.profileImage === 'string' ? data.profileImage : null,
    ...(Object.keys(eventMemberships).length > 0 ? { eventMemberships } : {}),
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
    register: async ({ name, email, password, team, eventType = 'diaknapok' }) => {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedTeam = normalizeTeamName(team) || 'Egyéni';
      if (eventType === 'februtalis' && (normalizedTeam.length < 2 || normalizedTeam.length > 60)) {
        throw new Error('Februtális team name must be between 2 and 60 characters');
      }
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const profileRef = doc(db, 'users', userCredential.user.uid);
      const profileData = {
        name,
        email: normalizedEmail,
        team: eventType === 'februtalis' ? 'Egyéni' : normalizedTeam,
        role: UserRole.CSAPATTAG,
        createdAt: new Date(),
        isVerified: false,
      };
      if (eventType === 'februtalis') {
        const teamKey = teamNameKey(normalizedTeam);
        const batch = writeBatch(db);
        batch.set(profileRef, profileData);
        batch.set(doc(db, 'event_registrations', `${userCredential.user.uid}_februtalis`), {
          uid: userCredential.user.uid,
          eventType,
          teamName: normalizedTeam,
          teamKey,
          createdAt: serverTimestamp(),
        });
        await batch.commit();
      } else {
        await setDoc(profileRef, profileData);
      }
      await sendEmailVerification(userCredential.user);
    },
    registerForEvent: async (eventType, teamName) => {
      const user = auth.currentUser;
      if (!user) throw new Error('A signed-in user is required to register for an event');
      const normalizedTeam = normalizeTeamName(teamName);
      if (
        eventType !== 'februtalis'
        || normalizedTeam.length < 2
        || normalizedTeam.length > 60
      ) {
        throw new Error('A valid Februtális team name is required');
      }
      const profile = await getDoc(doc(db, 'users', user.uid));
      if (!profile.exists()) throw new Error('The signed-in user profile does not exist');
      const teamKey = teamNameKey(normalizedTeam);
      await setDoc(doc(db, 'event_registrations', `${user.uid}_februtalis`), {
        uid: user.uid,
        eventType,
        teamName: normalizedTeam,
        teamKey,
        createdAt: serverTimestamp(),
      });
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