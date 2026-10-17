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

export default function TeamsRoute() {
  const router = useRouter();
  const { teams, refresh } = useTeams();
  const { sponsors, refreshSponsors } = useSponsors();
  const { profile } = useAuth();
  const canManageTeam = canRole(profile?.role, 'inviteMembers');

  useEffect(() => {
    void refresh();
    void refreshSponsors();
  }, [refresh, refreshSponsors]);

  const handleOpenLink = (link?: string) => {
    if (link) {
      void Linking.openURL(link);
    }
  };

  return (
    <TeamsScreen
      teams={teams}
      sponsors={sponsors}
      onBack={() => goBackOrHome(router)}
      onRefresh={() => {
        void refresh();
        void refreshSponsors();
      }}
      onOpenLink={handleOpenLink}
      canManageTeam={canManageTeam}
      isHeadOrganizer={profile?.role === UserRole.FOSZERVEZO}
      onOpenTeamManagement={() => router.push('/team-management')}
    />
  );
}
