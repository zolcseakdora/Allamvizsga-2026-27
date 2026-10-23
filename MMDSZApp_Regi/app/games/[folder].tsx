import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GAMES, getGameText } from '@/src/constants/games';
import type { GameEntry } from '@/src/constants/games';
import { GamesScreen } from '@/src/screens/games-screen';
import { goBackOrHome } from '@/src/utils/navigation';

export default function GamesFolderRoute() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { folder } = useLocalSearchParams<{ folder: string }>();
  const folderEntry = GAMES.find(item => item.id === folder && item.type === 'folder');

  const selectGame = (item: GameEntry) => {
    if (item.route) {
      router.push(item.route);
    } else if (item.type === 'folder') {
      router.push({ pathname: '/games/[folder]', params: { folder: item.id } });
    } else {
      router.push({
        pathname: '/games/[folder]/[gameId]',
        params: { folder: folderEntry?.id ?? 'games', gameId: item.id },
      });
    }
  };

  return (
    <GamesScreen
      title={folderEntry ? `${folderEntry.icon} ${getGameText(folderEntry.title, i18n.language)}` : t('games.title')}
      subtitle={folderEntry ? t('games.chooseInFolder') : ''}
      items={folderEntry?.children ?? []}
      onBack={() => goBackOrHome(router)}
      onSelect={selectGame}
    />
  );
}
