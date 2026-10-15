import { Linking } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { TeamsScreen } from '@/src/screens/teams-screen';
import { useTeams } from '@/src/hooks/use-teams';
import { useAuth } from '@/src/context/AuthContext';
import { canRole } from '@/src/constants/roles';
import { goBackOrHome } from '@/src/utils/navigation';

export default function TeamsRoute() {
  const router = useRouter();
  const { teams, refresh } = useTeams();
  const { profile } = useAuth();
  const canManageTeam = canRole(profile?.role, 'inviteMembers');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleOpenVideo = (videoLink?: string) => {
    if (videoLink) {
      void Linking.openURL(videoLink);
    }
  };

  return (
    <TeamsScreen
      teams={teams}
      onBack={() => goBackOrHome(router)}
      onRefresh={() => void refresh()}
      onOpenVideo={handleOpenVideo}
      canManageTeam={canManageTeam}
      onOpenTeamManagement={() => router.push('/team-management')}
    />
  );
}
