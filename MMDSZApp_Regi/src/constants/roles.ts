import { UserRole } from '@/src/types/auth';

export type Permission =
  | 'inviteOrganizers'
  | 'inviteMembers'
  | 'readNotifications'
  | 'sendNotifications'
  | 'manageAdmin'
  | 'manageGallery'
  | 'managePrograms'
  | 'manageUsers'
  | 'uploadIgazolas';

export type NavigationItem = {
  key: string;
  labelKey: string;
  route: '/' | '/schedule' | '/gallery' | '/games' | '/photo-hunt' | '/teams' | '/map'
    | '/notifications' | '/profile' | '/team-management' | '/admin' | '/users' | '/invites'
    | '/more' | null;
  icon: string;
  roles: readonly UserRole[];
  mobile: 'tab' | 'more';
  desktop: 'main' | 'organizing' | 'hidden';
  navigation?: 'push' | 'replace';
  modal?: boolean;
  params?: { section: 'verifications' };
  action?: 'logout';
};

const allRoles = Object.values(UserRole);
const organizers = [UserRole.FOSZERVEZO, UserRole.SZERVEZO] as const;
const juries = [UserRole.ZSURI] as const;
const captains = [UserRole.CSAPATKAPITANY, UserRole.ALCSAPATKAPITANY] as const;
const headOrganizer = [UserRole.FOSZERVEZO] as const;

export const navigationItems: readonly NavigationItem[] = [
  { key: 'home', labelKey: 'navigation.home', route: '/', icon: '🏠', roles: allRoles, mobile: 'more', desktop: 'main' },
  { key: 'programs', labelKey: 'navigation.programs', route: '/schedule', icon: '📅', roles: allRoles, mobile: 'tab', desktop: 'main' },
  { key: 'gallery', labelKey: 'navigation.gallery', route: '/gallery', icon: '🖼️', roles: allRoles, mobile: 'tab', desktop: 'main' },
  { key: 'games', labelKey: 'navigation.games', route: '/games', icon: '🎮', roles: allRoles, mobile: 'tab', desktop: 'main' },
  { key: 'teams', labelKey: 'navigation.teams', route: '/teams', icon: '🛡️', roles: allRoles, mobile: 'tab', desktop: 'main' },
  { key: 'map', labelKey: 'navigation.map', route: '/map', icon: '🗺️', roles: allRoles, mobile: 'more', desktop: 'main' },
  { key: 'notifications', labelKey: 'navigation.notifications', route: '/notifications', icon: '🔔', roles: allRoles, mobile: 'more', desktop: 'main', navigation: 'push' },
  { key: 'profile', labelKey: 'home.profile', route: '/profile', icon: '👤', roles: allRoles, mobile: 'more', desktop: 'hidden' },
  { key: 'teamManagement', labelKey: 'home.menuTeamManagement', route: '/team-management', icon: '⚙️', roles: captains, mobile: 'more', desktop: 'organizing' },
  { key: 'admin', labelKey: 'more.admin', route: '/admin', icon: '🛠️', roles: headOrganizer, mobile: 'more', desktop: 'organizing', modal: true },
  { key: 'users', labelKey: 'more.users', route: '/users', icon: '👥', roles: organizers, mobile: 'more', desktop: 'organizing' },
  { key: 'invites', labelKey: 'more.invites', route: '/invites', icon: '✉️', roles: headOrganizer, mobile: 'more', desktop: 'organizing' },
  { key: 'logout', labelKey: 'common.logout', route: null, icon: '🚪', roles: allRoles, mobile: 'more', desktop: 'hidden', action: 'logout' },
];

export const can: Record<Permission, readonly UserRole[]> = {
  inviteOrganizers: [UserRole.FOSZERVEZO],
  inviteMembers: [...captains],
  readNotifications: [...allRoles],
  sendNotifications: [UserRole.FOSZERVEZO],
  manageAdmin: [UserRole.FOSZERVEZO],
  manageGallery: [UserRole.FOSZERVEZO],
  managePrograms: [...organizers],
  manageUsers: [...organizers],
  uploadIgazolas: [...captains, UserRole.CSAPATTAG],
};

export const judgeRoles = [...juries] as const;

export function canRole(role: UserRole | undefined, permission: Permission) {
  return role !== undefined && can[permission].includes(role);
}

export function navigationItemsForRole(
  role: UserRole | undefined,
  group: NavigationItem['mobile'] | NavigationItem['desktop'],
) {
  return navigationItems.filter((item) => (
    item[group === 'tab' || group === 'more' ? 'mobile' : 'desktop'] === group
    && role !== undefined
    && item.roles.includes(role)
  ));
}
