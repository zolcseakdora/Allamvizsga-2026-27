import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import i18n from '@/src/i18n';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { GalleryNavigationProvider } from '@/src/context/GalleryNavigationContext';
import { ToastProvider } from '@/src/context/ToastContext';
import { NotificationsProvider } from '@/src/hooks/use-notifications';
import { UserRole } from '@/src/types/auth';
import { AppNavigation, AppNavigationHeader } from '@/src/components/app-navigation';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const { isLoggedIn, profile, isLoading } = useAuth(); 
  const segments = useSegments();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const hasApprovedAccess = Boolean(
    isLoggedIn && profile && (profile.isVerified || profile.role === UserRole.FOSZERVEZO),
  );
  
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
        if (currentGroup !== 'auth' && currentGroup !== 'invites') router.replace('/auth');
      } else if (isLoggedIn && !profile?.isVerified && profile?.role !== UserRole.FOSZERVEZO) {
        if (currentGroup !== 'verification') router.replace('/verification');
      } else if (inAuthGroup) {
        router.replace('/');
      }
    };

    checkRouteAndRedirect();
  }, [isLoggedIn, profile, isReady, isLoading, router, segments]);

  if (!isReady || isLoading) return null; 

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={styles.app}>
        {hasApprovedAccess && profile && <AppNavigationHeader role={profile.role} />}
        <View style={[styles.contentRow, hasApprovedAccess && isDesktop && styles.desktopRow]}>
          {hasApprovedAccess && isDesktop && profile && (
            <AppNavigation role={profile.role} sidebar />
          )}
          <View style={styles.stack}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="language" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="verification" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="more" />
              <Stack.Screen
                name="admin"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: t('modal.title'), headerShown: true }} />
            </Stack>
          </View>
        </View>
        {hasApprovedAccess && !isDesktop && profile && <AppNavigation role={profile.role} />}
      </View>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = {
  app: { flex: 1, backgroundColor: '#121212' },
  contentRow: { flex: 1, minHeight: 0 },
  desktopRow: { flexDirection: 'row' as const },
  stack: { flex: 1, minWidth: 0 },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <NotificationsProvider>
            <GalleryNavigationProvider>
              <RootLayoutNav />
            </GalleryNavigationProvider>
          </NotificationsProvider>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}