import { UserRole } from '@/src/types/auth';

export type Permission =
  | 'inviteOrganizers'
  | 'inviteMembers'
  | 'sendNotifications'
  | 'manageAdmin'
  | 'managePrograms'
  | 'manageUsers'
  | 'uploadIgazolas';

export type NavigationItem = {
  key: string;
  labelKey: string;
  route: '/' | '/schedule' | '/gallery' | '/photo-hunt' | '/teams' | '/map';
  icon: string;
  roles: readonly UserRole[];
};

const allRoles = Object.values(UserRole);

export const homeNavigationItem: NavigationItem = {
  key: 'home',
  labelKey: 'navigation.home',
  route: '/',
  icon: '🏠',
  roles: allRoles,
};

export const primaryNavigationItems: readonly NavigationItem[] = [
  { key: 'programs', labelKey: 'navigation.programs', route: '/schedule', icon: '📅', roles: allRoles },
  { key: 'gallery', labelKey: 'navigation.gallery', route: '/gallery', icon: '🖼️', roles: allRoles },
  // TODO: Replace the Photo Hunt destination when the dedicated games module is available.
  { key: 'games', labelKey: 'navigation.games', route: '/photo-hunt', icon: '🎮', roles: allRoles },
  { key: 'teams', labelKey: 'navigation.teams', route: '/teams', icon: '🛡️', roles: allRoles },
  { key: 'map', labelKey: 'navigation.map', route: '/map', icon: '🗺️', roles: allRoles },
];

export const can: Record<Permission, readonly UserRole[]> = {
  inviteOrganizers: [UserRole.FOSZERVEZO],
  inviteMembers: [UserRole.CSAPATKAPITANY, UserRole.ALCSAPATKAPITANY],
  sendNotifications: [UserRole.FOSZERVEZO],
  manageAdmin: [UserRole.FOSZERVEZO],
  managePrograms: [UserRole.FOSZERVEZO, UserRole.SZERVEZO],
  manageUsers: [UserRole.FOSZERVEZO, UserRole.SZERVEZO],
  uploadIgazolas: [UserRole.CSAPATTAG, UserRole.CSAPATKAPITANY, UserRole.ALCSAPATKAPITANY],
};

export function canRole(role: UserRole | undefined, permission: Permission) {
  return role !== undefined && can[permission].includes(role);
}

export function navigationItemsForRole(role: UserRole | undefined, includeHome = false) {
  const items = includeHome
    ? [homeNavigationItem, ...primaryNavigationItems]
    : primaryNavigationItems;
  return items.filter((item) => role !== undefined && item.roles.includes(role));
}
