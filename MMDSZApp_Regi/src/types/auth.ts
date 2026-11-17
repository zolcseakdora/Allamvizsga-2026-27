import type { User } from 'firebase/auth';
import type { EventSeason } from '@/src/constants/event-schedule';

export enum UserRole {
  FOSZERVEZO = 'Főszervező',
  SZERVEZO = 'Szervező',
  ZSURI = 'Zsűri',
  CSAPATKAPITANY = 'Csapatkapitány',
  ALCSAPATKAPITANY = 'Alcsapatkapitány',
  CSAPATTAG = 'Csapattag'
}

export type EventVerification = {
  imageUrl: string;
  status: 'pending' | 'approved';
  uploadedAt?: unknown;
};

export type UserProfile = {
  name: string;
  email: string;
  team: string;
  role: UserRole;
  igazolas?: string;
  eventVerifications?: Partial<Record<EventSeason, EventVerification>>;
  isVerified: boolean;
  profileImage?: string | null;
  eventMemberships?: Partial<Record<EventSeason, { teamId?: string; role: UserRole }>>;
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
  eventType?: EventSeason;
};
