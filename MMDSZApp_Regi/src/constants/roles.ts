import { UserRole } from '@/src/types/auth';

type Permission = 'inviteOrganizers' | 'inviteMembers' | 'sendNotifications';

export const can: Record<Permission, readonly UserRole[]> = {
  inviteOrganizers: [UserRole.FOSZERVEZO],
  inviteMembers: [UserRole.CSAPATKAPITANY, UserRole.ALCSAPATKAPITANY],
  sendNotifications: [UserRole.FOSZERVEZO],
};

export function canRole(role: UserRole | undefined, permission: Permission) {
  return role !== undefined && can[permission].includes(role);
}
