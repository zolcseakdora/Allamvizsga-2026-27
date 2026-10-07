import { Linking } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { TeamsScreen } from '@/src/screens/teams-screen';
import { useTeams } from '@/src/hooks/use-teams';

export default function TeamsRoute() {
  const router = useRouter();
  const { teams, refresh } = useTeams();

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
      onBack={() => router.back()}
      onRefresh={() => void refresh()}
      onOpenVideo={handleOpenVideo}
    />
  );
}
