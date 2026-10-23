import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { GAMES } from '@/src/constants/games';
import { GameDetailScreen } from '@/src/screens/game-detail-screen';
import { UserRole } from '@/src/types/auth';
import { goBackOrHome } from '@/src/utils/navigation';

export default function GameDetailRoute() {
  const router = useRouter();
  const { profile } = useAuth();
  const { folder, gameId } = useLocalSearchParams<{ folder: string; gameId: string }>();

  const game = folder === 'games'
    ? GAMES.find(item => item.id === gameId && item.type === 'game')
    : GAMES.find(item => item.id === folder)?.children.find(item => item.id === gameId && item.type === 'game');

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
