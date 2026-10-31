import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { useTranslation } from 'react-i18next';

import { functions } from '@/src/config/firebase';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import {
  InviteManagementScreen,
  type OrganizerInviteRole,
} from '@/src/screens/invite-management-screen';
import { UserRole } from '@/src/types/auth';

export default function AdminInvitesRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile, isLoading } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizerInviteRole>(UserRole.SZERVEZO);
  const [isSending, setIsSending] = useState(false);
  const isAuthorized = profile?.role === UserRole.FOSZERVEZO
    && profile?.accountStatus !== 'disabled'
    && profile?.accountStatus !== 'rejected'
    && (profile?.accountStatus === undefined || profile?.accountStatus === 'active');

  useEffect(() => {
    if (!isLoading && !isAuthorized) router.replace('/');
  }, [isLoading, isAuthorized, router]);

  const handleSendInvite = async () => {
    if (!isAuthorized || isSending) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast(t('inviteManagement.invalidEmail'), 'error');
      return;
    }
    setIsSending(true);
    try {
      const createInvite = httpsCallable<
        { email: string; role: OrganizerInviteRole },
        { status: string }
      >(functions, 'createInvite');
      await createInvite({ email: email.trim().toLowerCase(), role });
      showToast(t('inviteManagement.queued'), 'success');
      setEmail('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading || !isAuthorized) return null;

  return (
    <InviteManagementScreen
      email={email}
      role={role}
      isSending={isSending}
      onBack={() => router.back()}
      onEmailChange={setEmail}
      onRoleChange={setRole}
      onSendInvite={() => void handleSendInvite()}
    />
  );
}
