// A jóváhagyásra váró szerepkör CSAK megjelenítési adat.
// A tényleges jogosultságot kizárólag a backend állíthatja be.
export type ReviewStatus = string | undefined;
export type ReviewableProfile = {
  role?: string;
  pendingRole?: string;
  accountStatus?: ReviewStatus;
  membershipStatus?: ReviewStatus;
};
const reviewableStatuses = new Set([
  'pending_captain_approval',
  'pending_verification',
  'pending_admin_approval',
  'pending_admin_activation',
]);
export function registrationReviewStatus(user: ReviewableProfile): ReviewStatus {
  return user.accountStatus ?? user.membershipStatus;
}
export function isRegistrationReviewPending(user: ReviewableProfile): boolean {
  const accountStatus = user.accountStatus;
  const membershipStatus = user.membershipStatus;
  return (typeof accountStatus === 'string' && reviewableStatuses.has(accountStatus))
    || (typeof membershipStatus === 'string' && reviewableStatuses.has(membershipStatus));
}
export function requestedRegistrationRole(user: ReviewableProfile): string | undefined {
  if (user.accountStatus === 'pending_captain_approval'
    || user.membershipStatus === 'pending_captain_approval') return 'Csapatkapitány';
  return user.pendingRole ?? user.role;
}
export function registrationStatusLabel(user: ReviewableProfile): string {
  const status = registrationReviewStatus(user);
  switch (status) {
    case 'pending_email_verification': return 'E-mail megerősítésére vár';
    case 'pending_captain_approval':
    case 'pending_verification':
    case 'pending_admin_approval':
    case 'pending_admin_activation': return 'Főszervezői jóváhagyásra vár';
    case 'active': return 'Aktív';
    case 'rejected': return 'Elutasítva';
    case 'disabled': return 'Letiltva';
    default: return 'Nincs megadva';
  }
}
