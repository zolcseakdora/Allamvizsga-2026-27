export type LocalizedGameText = {
  hu: string;
  en: string;
};

export type GameEntry = {
  id: string;
  title: LocalizedGameText;
  icon: string;
  type: 'folder' | 'game';
  children: GameEntry[];
  description: LocalizedGameText;
  route?: '/photo-hunt';
};

const game = (
  id: string,
  title: LocalizedGameText,
  icon: string,
  description: LocalizedGameText,
): GameEntry => ({ id, title, icon, type: 'game', children: [], description });

export const GAMES: GameEntry[] = [
  {
    id: 'sports',
    title: { hu: 'Sportok', en: 'Sports' },
    icon: '⚽',
    type: 'folder',
    description: {
      hu: 'Válassz a sportversenyek közül.',
      en: 'Choose from the sports competitions.',
    },
    children: [
      game('football', { hu: 'Foci', en: 'Football' }, '⚽', {
        hu: 'Mérjétek össze tudásotokat a focipályán!',
        en: 'Put your skills to the test on the football pitch!',
      }),
      game('basketball', { hu: 'Kosárlabda', en: 'Basketball' }, '🏀', {
        hu: 'Csapatmunka és pontos dobások várnak.',
        en: 'Teamwork and accurate shots await.',
      }),
      game('table-tennis', { hu: 'Ping-pong', en: 'Table tennis' }, '🏓', {
        hu: 'Pörgős mérkőzések az asztalnál.',
        en: 'Fast-paced matches at the table.',
      }),
      game('rowing', { hu: 'Evezés', en: 'Rowing' }, '🚣', {
        hu: 'Húzzatok együtt, és érjetek célba elsőként!',
        en: 'Pull together and be the first to reach the finish!',
      }),
      game('volleyball', { hu: 'Röplabda', en: 'Volleyball' }, '🏐', {
        hu: 'Üssétek át a labdát, és szerezzetek pontot!',
        en: 'Send the ball over the net and score!',
      }),
      game('swimming', { hu: 'Úszás', en: 'Swimming' }, '🏊', {
        hu: 'Versenyezzetek a medencében!',
        en: 'Race each other in the pool!',
      }),
      game('running', { hu: 'Futás', en: 'Running' }, '🏃', {
        hu: 'Fussatok együtt a célvonalig!',
        en: 'Run together to the finish line!',
      }),
    ],
  },
  game('scavenging', { hu: 'Harácsolás', en: 'Scavenging' }, '📜', {
    hu: 'Csapatmunka és ügyesség a Harácsolás során.',
    en: 'Teamwork and skill during Scavenging.',
  }),
  {
    id: 'photo-hunt',
    title: { hu: 'Photo Hunt', en: 'Photo Hunt' },
    icon: '📷',
    type: 'folder',
    children: [],
    description: {
      hu: 'Teljesítsd a feladatokat, és töltsd fel a fotókat!',
      en: 'Complete the challenges and upload your photos!',
    },
    route: '/photo-hunt',
  },
  game('weekend-games', { hu: 'Weekend játékok', en: 'Weekend games' }, '🎮', {
    hu: 'Fedezd fel a Weekend játékait!',
    en: 'Discover the Weekend games!',
  }),
  game('karaoke', { hu: 'Karaoke', en: 'Karaoke' }, '🎤', {
    hu: 'Válassz egy dalt, és mutasd meg a hangod!',
    en: 'Choose a song and show off your voice!',
  }),
  game('team-video', { hu: 'Csapatvideó', en: 'Team video' }, '🎬', {
    hu: 'Mutassátok be a csapatotokat egy videóban!',
    en: 'Introduce your team in a video!',
  }),
];

export function getGameText(text: LocalizedGameText, language: string) {
  return language.toLowerCase().startsWith('en') ? text.en : text.hu;
}
