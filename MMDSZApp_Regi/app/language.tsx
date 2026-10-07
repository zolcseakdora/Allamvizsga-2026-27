import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/src/i18n';
import { LanguageSelectionScreen } from '@/src/screens/language-selection-screen';

export default function LanguageRoute() {
  const router = useRouter();

  const handleSelectLanguage = async (nextLanguage: 'hu' | 'en') => {
    await i18n.changeLanguage(nextLanguage);
    await AsyncStorage.setItem('appLanguage', nextLanguage);
    router.replace('/'); 
  };

  return <LanguageSelectionScreen onSelectLanguage={handleSelectLanguage} />;
}