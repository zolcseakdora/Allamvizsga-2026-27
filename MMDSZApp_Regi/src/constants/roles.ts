import { UserRole } from '@/src/types/auth';

type Permission = 'inviteOrganizers' | 'inviteMembers';

export const can: Record<Permission, readonly UserRole[]> = {
  inviteOrganizers: [UserRole.FOSZERVEZO],
  inviteMembers: [UserRole.CSAPATKAPITANY, UserRole.ALCSAPATKAPITANY],
};

export function canRole(role: UserRole | undefined, permission: Permission) {
  return role !== undefined && can[permission].includes(role);
}
