
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  createUserWithEmailAndPassword,
  deleteUser,
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

// Kezdeti bejelentkezési állapot
const initialAuthState: AuthState = {
  user: null,
  profile: null,
  status: 'loading',
};

// Az AuthContext által biztosított funkciók
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

export type InviteRedemptionResult =
  | 'none'
  | 'unverified'
  | { status: 'accepted'; team: string };

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Ellenőrizzük, hogy érvényes szerepkört kaptunk-e
function isUserRole(value: unknown): value is UserRole {
  return Object.values(UserRole).some((role) => role === value);
}

// Meghívó beváltása e-mail-megerősítés után
async function redeemPendingInvite(
  user: User
): Promise<InviteRedemptionResult> {
  if (!user.emailVerified || !user.email) {
    return 'unverified';
  }

  const redeemInvite = httpsCallable<
    { name: string },
    { status: 'none' } | { status: 'accepted'; team: string }
  >(functions, 'redeemInvite');

  const result = await redeemInvite({
    name: user.displayName ?? '',
  });

  if (result.data.status === 'none') {
    return 'none';
  }

  if (
    result.data.status === 'accepted' &&
    typeof result.data.team === 'string'
  ) {
    return {
      status: 'accepted',
      team: result.data.team,
    };
  }

  throw new Error('Invalid invitation redemption response');
}

// Felhasználói fiók állapotának ellenőrzése
function isAccountStatus(value: unknown): value is AccountStatus {
  return [
    'pending_captain_approval',
    'pending_email_verification',
    'pending_verification',
    'pending_admin_approval',
    'pending_admin_activation',
    'active',
    'rejected',
    'disabled',
  ].includes(value as string);
}

// Csapattagsági állapot ellenőrzése
function isMembershipStatus(value: unknown): value is MembershipStatus {
  return [
    'pending_captain_approval',
    'pending_email_verification',
    'pending_verification',
    'pending_admin_approval',
    'pending_admin_activation',
    'active',
    'rejected',
  ].includes(value as string);
}

// Firestore-adatok átalakítása felhasználói profillá
function toUserProfile(
  user: User,
  data: Record<string, unknown>
): UserProfile {
  const rawRole = data.role as string;

  const resolvedRole: UserRole =
    Object.values(UserRole).includes(rawRole as UserRole)
      ? (rawRole as UserRole)
      : UserRole.CSAPATTAG;

  return {
    name: typeof data.name === 'string' ? data.name : '',
    email:
      typeof data.email === 'string'
        ? data.email
        : user.email ?? '',
    team: typeof data.team === 'string' ? data.team : '',
    role: resolvedRole,
    igazolas:
      typeof data.igazolas === 'string'
        ? data.igazolas
        : undefined,
    isVerified: data.isVerified === true,
    profileImage:
      typeof data.profileImage === 'string'
        ? data.profileImage
        : null,
    accountStatus: isAccountStatus(data.accountStatus)
      ? data.accountStatus
      : undefined,
    membershipStatus: isMembershipStatus(data.membershipStatus)
      ? data.membershipStatus
      : undefined,
    pendingRole: isUserRole(data.pendingRole)
      ? data.pendingRole
      : undefined,
    requestedTeamName:
      typeof data.requestedTeamName === 'string'
        ? data.requestedTeamName
        : undefined,
  };
}

// AuthProvider: a teljes alkalmazás bejelentkezési állapotát kezeli
export function AuthProvider({ children }: PropsWithChildren) {
  const [authState, setAuthState] = useState<AuthState>(
    initialAuthState
  );

  // Firebase Authentication állapotának figyelése
  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;

      // Nincs bejelentkezett felhasználó
      if (!user) {
        setAuthState({
          user: null,
          profile: null,
          status: 'unauthenticated',
        });
        return;
      }

      // Megerősített e-mail esetén meghívó beváltása
      if (user.emailVerified) {
        void redeemPendingInvite(user).catch((error: unknown) => {
          console.error(
            'Failed to redeem pending invitation on sign-in',
            error
          );
        });
      }

      // Felhasználói profil figyelése
      unsubscribeProfile = onSnapshot(
        doc(db, 'users', user.uid),
        (snapshot) => {
          const profile = snapshot.exists()
            ? toUserProfile(user, snapshot.data())
            : null;

          setAuthState({
            user,
            profile,
            status: 'authenticated',
          });
        }
      );
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

    // BEJELENTKEZÉS
    login: async (email, password) => {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
    },

    // REGISZTRÁCIÓ - JAVÍTOTT VÁLTOZAT
    register: async ({
      name,
      email,
      password,
      team,
      registrationCode,
      invited,
    }) => {
      const normalizedName = name.trim();
      const normalizedEmail = email.trim().toLowerCase();
      const code = registrationCode?.trim() ?? '';
      const teamName = team?.trim() ?? '';

      // 1. Kötelező adatok ellenőrzése
      if (!normalizedName || !normalizedEmail || !password) {
        throw new Error(
          'Minden kötelező mezőt ki kell tölteni.'
        );
      }

      // Csak kapitányi kóddal vagy meghívóval lehet regisztrálni
      if (!code && !invited) {
        throw new Error(
          'Regisztrációs kód vagy meghívó szükséges.'
        );
      }

      if (code && !teamName) {
        throw new Error(
          'A csapat neve kötelező.'
        );
      }

      // 2. Firebase Authentication-fiók létrehozása
      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          password
        );

      const createdUser = userCredential.user;

      // 3. Szerveroldali regisztrációs ellenőrzés
      try {
        if (code) {
          // Kapitányi jelentkezés
          const requestCaptainRegistration = httpsCallable<
            {
              code: string;
              name: string;
              teamName: string;
            },
            { status: string }
          >(functions, 'requestCaptainRegistration');

          await requestCaptainRegistration({
            code,
            name: normalizedName,
            teamName,
          });
        } else if (invited) {
          // Meghívóval történő regisztráció
          const prepareInvitedRegistration = httpsCallable<
            { name: string },
            { status: string }
          >(functions, 'prepareInvitedRegistration');

          await prepareInvitedRegistration({
            name: normalizedName,
          });
        }
      } catch (error: unknown) {
        // 4. Sikertelen regisztráció kezelése
        const errorCode =
          (error as { code?: string } | null)?.code;

        // Csak egyértelmű szerveroldali elutasítások
        const rejectedCodes = [
          'functions/invalid-argument',
          'functions/not-found',
          'functions/failed-precondition',
          'functions/permission-denied',
          'functions/already-exists',
        ];

        if (
          errorCode &&
          rejectedCodes.includes(errorCode)
        ) {
          // Az új fiók törlése, ha a szerver elutasította
          // a regisztrációs kérelmet
          try {
            await deleteUser(createdUser);
          } catch (cleanupError) {
            console.error(
              'A regisztrációs fiók törlése sikertelen:',
              cleanupError
            );

            throw new Error(
              'A regisztráció sikertelen, és az ideiglenes fiókot nem sikerült törölni. Kérj segítséget a főszervezőtől.'
            );
          }

          throw error;
        }

        // Hálózati vagy ismeretlen hibánál a szerver
        // esetleg már feldolgozta a regisztrációt.
        // Ilyenkor nem törlünk automatikusan.
        console.error(
          'A regisztráció állapota bizonytalan:',
          error
        );

        throw new Error(
          'A fiók létrejött, de a regisztráció befejezése nem ellenőrizhető. Ne regisztrálj újra ugyanazzal az e-mail-címmel. Ellenőrizni kell a fiók állapotát.'
        );
      }

      // 5. Megjelenített név beállítása
      // Itt a szerver már elfogadta a regisztrációs kérelmet.
      try {
        await updateProfile(createdUser, {
          displayName: normalizedName,
        });
      } catch (profileError) {
        console.warn(
          'A megjelenített név frissítése sikertelen:',
          profileError
        );
      }

      // 6. E-mail-megerősítés küldése
      try {
        await sendEmailVerification(createdUser);
      } catch (verificationError) {
        console.error(
          'E-mail-megerősítés küldési hiba:',
          verificationError
        );

        throw new Error(
          'A regisztrációs kérelem létrejött, de az e-mail-megerősítést nem sikerült elküldeni. Jelentkezz be, és kérj új megerősítő e-mailt.'
        );
      }
    },

    // MEGERŐSÍTŐ E-MAIL ÚJRAKÜLDÉSE
    resendVerificationEmail: async () => {
      const user = auth.currentUser;

      if (!user?.email) {
        throw new Error(
          'The signed-in user has no email address'
        );
      }

      await sendEmailVerification(user);
    },

    // E-MAIL MEGERŐSÍTÉSE ÉS MEGHÍVÓ BEVÁLTÁSA
    confirmEmailAndRedeem: async () => {
      const user = auth.currentUser;

      if (!user?.email) {
        return 'unverified';
      }

      await user.reload();
      await user.getIdToken(true);

      setAuthState((current) =>
        current.user?.uid === user.uid
          ? { ...current, user }
          : current
      );

      if (!user.emailVerified) {
        return 'unverified';
      }

      return redeemPendingInvite(user);
    },

    // ELFELEJTETT JELSZÓ
    resetPassword: async (email) => {
      await sendPasswordResetEmail(auth, email);
    },

    // KIJELENTKEZÉS
    logout: async () => {
      await AsyncStorage.clear();
      await signOut(auth);
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// AuthContext használata az alkalmazás többi részében
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
}
