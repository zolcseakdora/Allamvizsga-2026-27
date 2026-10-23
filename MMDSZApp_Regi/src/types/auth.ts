import type { User } from 'firebase/auth';

export enum UserRole {
  FOSZERVEZO = 'Főszervező',
  SZERVEZO = 'Szervező',
  CSAPATKAPITANY = 'Csapatkapitány',
  ALCSAPATKAPITANY = 'Alcsapatkapitány',
  CSAPATTAG = 'Csapattag'
}

export type UserProfile = {
  name: string;
  email: string;
  team: string;
  role: UserRole;
  igazolas?: string;
  isVerified: boolean;
  profileImage?: string | null;
};

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  status: AuthStatus;
};

export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
  team: string;
};
