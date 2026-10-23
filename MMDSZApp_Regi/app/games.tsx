import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GAMES } from '@/src/constants/games';
import type { GameEntry } from '@/src/constants/games';
import { GamesScreen } from '@/src/screens/games-screen';

export default function GamesRoute() {
  const router = useRouter();
  const { t } = useTranslation();

  const selectGame = (item: GameEntry) => {
    if (item.route) {
      router.push(item.route);
    } else if (item.type === 'folder') {
      router.push({ pathname: '/games/[folder]', params: { folder: item.id } });
    } else {
      router.push({
        pathname: '/games/[folder]/[gameId]',
        params: { folder: 'games', gameId: item.id },
      });
    }
  };

  return (
    <GamesScreen
      title={`🎮 ${t('games.title')}`}
      subtitle={t('games.chooseGame')}
      items={GAMES}
      onSelect={selectGame}
    />
  );
}
