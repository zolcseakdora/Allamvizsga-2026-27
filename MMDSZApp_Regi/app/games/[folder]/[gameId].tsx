import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { FEBRUTALIS_GAMES, GAMES } from '@/src/constants/games';
import { GameDetailScreen } from '@/src/screens/game-detail-screen';
import { UserRole } from '@/src/types/auth';
import { goBackOrHome } from '@/src/utils/navigation';
import { useEventSeason } from '@/src/context/EventSeasonContext';

export default function GameDetailRoute() {
  const router = useRouter();
  const { profile } = useAuth();
  const { eventType } = useEventSeason();
  const games = eventType === 'februtalis' ? FEBRUTALIS_GAMES : GAMES;
  const { folder, gameId } = useLocalSearchParams<{ folder: string; gameId: string }>();

  const game = folder === 'games'
    ? games.find(item => item.id === gameId && item.type === 'game')
    : games.find(item => item.id === folder)?.children.find(item => item.id === gameId && item.type === 'game');

  // TODO: Add team assignments, scoring workflows, and the leaderboard here.
  const showScoring = profile?.role === UserRole.SZERVEZO || profile?.role === UserRole.FOSZERVEZO;

  return (
    <GameDetailScreen
      game={game}
      showScoring={showScoring}
      onBack={() => goBackOrHome(router)}
    />
  );
}
