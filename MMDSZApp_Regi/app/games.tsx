import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FEBRUTALIS_GAMES, GAMES } from '@/src/constants/games';
import type { GameEntry } from '@/src/constants/games';
import { GamesScreen } from '@/src/screens/games-screen';
import { useEventSeason } from '@/src/context/EventSeasonContext';

export default function GamesRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { eventType } = useEventSeason();
  const games = eventType === 'februtalis' ? FEBRUTALIS_GAMES : GAMES;

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
      items={games}
      onSelect={selectGame}
    />
  );
}
