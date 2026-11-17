import { useEffect, useState } from 'react';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { InviteManagementScreen, type OrganizerInviteRole } from '@/src/screens/invite-management-screen';
import { canRole } from '@/src/constants/roles';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { db } from '@/src/config/firebase';
import { useTeams } from '@/src/hooks/use-teams';
import { useEventSeason } from '@/src/context/EventSeasonContext';
import { UserRole } from '@/src/types/auth';
import { goBackOrHome } from '@/src/utils/navigation';
import { normalizeTeamName } from '@/src/utils/team-name';

export default function InvitesRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const { eventType } = useEventSeason();
  const { showToast } = useToast();
  const { teams, refresh } = useTeams();
  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizerInviteRole>(UserRole.SZERVEZO);

  useEffect(() => {
    if (eventType === 'februtalis') return;
    void refresh().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
    });
  }, [eventType, refresh, showToast, t]);

  const teamNames = eventType === 'februtalis'
    ? []
    : [...new Set(teams.map((team) => normalizeTeamName(team.name ?? team.id)).filter(Boolean))];
  const firstTeamName = teamNames[0] ?? '';
  const selectedTeamName = teamNames.includes(teamName) ? teamName : firstTeamName;

  const handleSendInvite = async () => {
    if (!canRole(profile?.role, 'inviteOrganizers')) {
      showToast(t('alerts.inviteNotAllowed'), 'error');
      return;
    }
    if (!email.trim() || (eventType === 'diaknapok' && !selectedTeamName)) {
      showToast(t(eventType === 'februtalis'
        ? 'alerts.februtalisInviteFieldsRequired'
        : 'alerts.inviteFieldsRequired'), 'error');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const inviteRoleLabel = role === UserRole.SZERVEZO
      ? t('roles.organizer')
      : role === UserRole.ZSURI
        ? t('roles.jury')
        : role === UserRole.CSAPATKAPITANY
          ? t('roles.captain')
          : t('roles.deputy');
    const body = eventType === 'februtalis'
      ? t('inviteManagement.februtalisEmailBody', {
        eventName: t('eventNames.februtalis'),
        role: inviteRoleLabel,
      })
      : t('inviteManagement.emailBody', { teamName: selectedTeamName, role: inviteRoleLabel });

    try {
      await setDoc(doc(db, 'invites', normalizedEmail), {
        email: normalizedEmail,
        ...(eventType === 'februtalis'
          ? { eventType: 'februtalis' }
          : { team: normalizeTeamName(selectedTeamName) }),
        role,
        invitedBy: profile?.name || UserRole.FOSZERVEZO,
        createdAt: new Date(),
        status: 'Függőben',
      });
      await addDoc(collection(db, 'mail'), {
        to: normalizedEmail,
        message: {
          subject: t(eventType === 'februtalis'
            ? 'inviteManagement.februtalisEmailSubject'
            : 'inviteManagement.emailSubject'),
          text: `${t('inviteManagement.emailGreeting')} ${body} ${t(eventType === 'februtalis'
            ? 'inviteManagement.februtalisEmailAction'
            : 'inviteManagement.emailAction')}`,
          html: `<h3>${t('inviteManagement.emailGreeting')}</h3><p>${body}</p><p>${t(eventType === 'februtalis'
            ? 'inviteManagement.februtalisEmailAction'
            : 'inviteManagement.emailAction')}</p>`,
        },
      });
      setEmail('');
      showToast(t('alerts.inviteSent', { email: normalizedEmail }), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
    }
  };

  return (
    <InviteManagementScreen
      eventType={eventType}
      teams={teamNames}
      teamName={selectedTeamName}
      email={email}
      role={role}
      onBack={() => goBackOrHome(router)}
      onTeamChange={setTeamName}
      onEmailChange={setEmail}
      onRoleChange={setRole}
      onSendInvite={() => void handleSendInvite()}
    />
  );
}
