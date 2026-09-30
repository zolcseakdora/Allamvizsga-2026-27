import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en';
import hu from './locales/hu';

void i18n.use(initReactI18next).init({
  resources: {
    hu: { translation: hu },
    en: { translation: en },
  },
  lng: 'hu',
  fallbackLng: 'hu',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
