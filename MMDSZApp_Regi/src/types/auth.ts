import type { User } from 'firebase/auth';

export enum UserRole {
  FOSZERVEZO = 'Főszervező',
  SZERVEZO = 'Szervező',
  ZSURI = 'Zsűri',
  CSAPATKAPITANY = 'Csapatkapitány',
  ALCSAPATKAPITANY = 'Alcsapatkapitány',
  CSAPATTAG = 'Csapattag'
}

export type AccountStatus =
  | 'pending_captain_approval'
  | 'pending_verification'
  | 'pending_admin_approval'
  | 'pending_admin_activation'
  | 'active'
  | 'rejected'
  | 'disabled';

export type MembershipStatus =
  | 'pending_captain_approval'
  | 'pending_verification'
  | 'pending_admin_approval'
  | 'pending_admin_activation'
  | 'active'
  | 'rejected';

export type UserProfile = {
  name: string;
  email: string;
  team: string;
  role: UserRole;
  igazolas?: string;
  isVerified: boolean;
  profileImage?: string | null;
  accountStatus?: AccountStatus;
  membershipStatus?: MembershipStatus;
  pendingRole?: UserRole;
  requestedTeamName?: string;
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
  team?: string;
  registrationCode?: string;
  // Kompatibilitás a meglévő meghívós oldalakkal. Nem jogosultságigénylés:
  // a szerver dönti el a tényleges szerepkört a meghívó/kapitányi kód alapján.
  role?: UserRole;
};

export enum AuthMode {
  LOGIN = 'login',
  REGISTER_CAPTAIN = 'register_captain',
  REGISTER_MEMBER = 'register_member',
  REGISTER_ORGANIZER = 'register_organizer',
}
