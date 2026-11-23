import { Linking } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { TeamsScreen } from '@/src/screens/teams-screen';
import { useTeams } from '@/src/hooks/use-teams';
import { useSponsors } from '@/src/hooks/use-sponsors';
import { useAuth } from '@/src/context/AuthContext';
import { canRole } from '@/src/constants/roles';
import { goBackOrHome } from '@/src/utils/navigation';
import { UserRole } from '@/src/types/auth';
import { useEventSeason } from '@/src/context/EventSeasonContext';

export default function TeamsRoute() {
  const router = useRouter();
  const { teams, refresh } = useTeams();
  const { sponsors, refreshSponsors } = useSponsors();
  const { profile } = useAuth();
  const { eventType } = useEventSeason();
  const currentTeamId = eventType === 'februtalis'
    ? profile?.eventMemberships?.februtalis?.teamId
    : undefined;
  const currentRole = eventType === 'februtalis'
    ? profile?.eventMemberships?.februtalis?.role ?? profile?.role
    : profile?.role;
  const canManageTeam = canRole(currentRole, 'inviteMembers');

  useEffect(() => {
    void refresh(eventType);
    void refreshSponsors();
  }, [eventType, refresh, refreshSponsors]);

  const handleOpenLink = (link?: string) => {
    if (link) {
      void Linking.openURL(link);
    }
  };

  return (
    <TeamsScreen
      teams={teams}
      sponsors={sponsors}
      eventType={eventType}
      currentTeamId={currentTeamId}
      onBack={() => goBackOrHome(router)}
      onRefresh={() => {
        void refresh(eventType);
        void refreshSponsors();
      }}
      onOpenLink={handleOpenLink}
      canManageTeam={canManageTeam}
      isHeadOrganizer={profile?.role === UserRole.FOSZERVEZO}
      onOpenTeamManagement={() => router.push('/team-management')}
    />
  );
}
