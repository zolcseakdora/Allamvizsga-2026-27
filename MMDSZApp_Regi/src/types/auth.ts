
import type { User } from 'firebase/auth';
import type { EventSeason } from '@/src/constants/event-schedule';

export enum UserRole {
  FOSZERVEZO = 'Főszervező',
  SZERVEZO = 'Szervező',
  ZSURI = 'Zsűri',
  CSAPATKAPITANY = 'Csapatkapitány',
  ALCSAPATKAPITANY = 'Alcsapatkapitány',
  CSAPATTAG = 'Csapattag',
}

export type AccountStatus =
  | 'pending_captain_approval'
  | 'pending_email_verification'
  | 'pending_verification'
  | 'pending_admin_approval'
  | 'pending_admin_activation'
  | 'active'
  | 'rejected'
  | 'disabled';

export type MembershipStatus =
  | 'pending_captain_approval'
  | 'pending_email_verification'
  | 'pending_verification'
  | 'pending_admin_approval'
  | 'pending_admin_activation'
  | 'active'
  | 'rejected';

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
  isVerified: boolean;
  profileImage?: string | null;

  // Diáknapok – regisztráció és jóváhagyás
  accountStatus?: AccountStatus;
  membershipStatus?: MembershipStatus;
  pendingRole?: UserRole;
  requestedTeamName?: string;

  // FebruTális és Diáknapok – eseményenkénti adatok
  eventMemberships?: Partial<
    Record<EventSeason, {
      teamId?: string;
      role: UserRole;
    }>
  >;

  eventVerifications?: Partial<
    Record<EventSeason, EventVerification>
  >;
};

export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';

export type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  status: AuthStatus;
};

export type RegistrationInput = {
  name: string;
  email: string;
  password: string;

  // Meglévő regisztrációs rendszer
  team?: string;
  registrationCode?: string;
  invited?: boolean;

  // A tényleges szerepkört a szerver határozza meg
  role?: UserRole;

  // FebruTális / Diáknapok
  eventType?: EventSeason;
};

export enum AuthMode {
  LOGIN = 'login',
  REGISTER_CAPTAIN = 'register_captain',
  REGISTER_MEMBER = 'register_member',
  REGISTER_INVITED = 'register_invited',
  REGISTER_ORGANIZER = 'register_organizer',
}
