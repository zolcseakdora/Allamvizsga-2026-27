import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import i18n from '@/src/i18n';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { ToastProvider } from '@/src/context/ToastContext';
import { UserRole } from '@/src/types/auth';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const { isLoggedIn, profile, isLoading } = useAuth(); 
  const segments = useSegments();
  const router = useRouter();
  
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initLang = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('appLanguage');
        if (savedLang) {
          await i18n.changeLanguage(savedLang);
        }
      } catch (e) {
        console.error("Language check failed", e);
      } finally {
        setIsReady(true);
      }
    };
    initLang();
  }, []);

  useEffect(() => {
    if (!isReady || isLoading) return; 

    const checkRouteAndRedirect = async () => {
      const savedLang = await AsyncStorage.getItem('appLanguage');
      const hasLang = !!savedLang;
      
      const currentGroup = segments[0]; 
      const inAuthGroup = currentGroup === 'auth' || currentGroup === 'language' || currentGroup === 'verification';
      
      if (!hasLang) {
        if (currentGroup !== 'language') router.replace('/language');
      } else if (!isLoggedIn) {
        if (currentGroup !== 'auth') router.replace('/auth');
      } else if (isLoggedIn && !profile?.isVerified && profile?.role !== UserRole.FOSZERVEZO) {
        if (currentGroup !== 'verification') router.replace('/verification');
      } else if (inAuthGroup) {
        router.replace('/');
      }
    };

    checkRouteAndRedirect();
  }, [isLoggedIn, profile, isReady, isLoading, segments]);

  if (!isReady || isLoading) return null; 

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="language" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="verification" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: t('modal.title'), headerShown: true }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RootLayoutNav />
      </ToastProvider>
    </AuthProvider>
  );
}