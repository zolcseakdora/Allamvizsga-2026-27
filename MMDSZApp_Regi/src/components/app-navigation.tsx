import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAuth } from '@/src/context/AuthContext';
import { useNotifications } from '@/src/hooks/use-notifications';
import { navigationItemsForRole } from '@/src/constants/roles';
import { UserRole } from '@/src/types/auth';

function translatedRole(role: UserRole, t: (key: string) => string) {
  switch (role) {
    case UserRole.FOSZERVEZO:
      return t('roles.headOrganizer');
    case UserRole.SZERVEZO:
      return t('roles.organizer');
    case UserRole.CSAPATKAPITANY:
      return t('roles.captain');
    case UserRole.ALCSAPATKAPITANY:
      return t('roles.deputy');
    case UserRole.CSAPATTAG:
      return t('roles.member');
    default:
      return role;
  }
}

export function AppNavigationHeader({ role }: { role: UserRole }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 8, paddingHorizontal: width < 500 ? 10 : 22 },
      ]}
    >
      <View style={styles.brandBlock}>
        <Pressable onPress={() => router.replace('/')} accessibilityRole="link">
          <Text style={[styles.brand, width < 500 && styles.compactBrand]} numberOfLines={1}>
            {t('navigation.brand')}
          </Text>
        </Pressable>
        <Text style={[styles.signedIn, width < 500 && styles.compactSignedIn]} numberOfLines={1}>
          {t('home.signedInAs')} <Text style={styles.role}>{translatedRole(role, t)}</Text>
        </Text>
      </View>
      <View style={[styles.headerActions, width < 500 && styles.compactActions]}>
        <Pressable
          onPress={() => router.push('/notifications')}
          style={styles.bellButton}
          accessibilityRole="button"
          accessibilityLabel={t('navigation.notifications')}
        >
          <Ionicons name="notifications-outline" size={23} color="#FFFFFF" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => router.push('/profile')} style={styles.headerButton}>
          <Text style={styles.profileText}>{t('home.profile')}</Text>
        </Pressable>
        <Pressable onPress={() => void logout()} style={styles.headerButton}>
          <Text style={styles.logoutText}>{t('common.logout')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function AppNavigation({ role, sidebar = false }: { role: UserRole; sidebar?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const items = navigationItemsForRole(role, sidebar);

  return (
    <View
      style={[
        sidebar ? styles.sidebar : styles.tabBar,
        !sidebar && { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {sidebar && <Text style={styles.sidebarTitle}>{t('navigation.menu')}</Text>}
      <ScrollView
        horizontal={!sidebar}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={sidebar ? styles.sidebarItems : styles.tabItems}
      >
        {items.map((item) => {
          const active = item.route === '/'
            ? pathname === '/'
            : pathname === item.route || pathname.startsWith(`${item.route}/`);
          return (
            <Pressable
              key={item.key}
              onPress={() => router.replace(item.route)}
              accessibilityRole="link"
              accessibilityState={{ selected: active }}
              style={[
                sidebar ? styles.sidebarItem : styles.tabItem,
                active && styles.activeItem,
              ]}
            >
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <Text style={[styles.itemLabel, active && styles.activeLabel]} numberOfLines={1}>
                {t(item.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 76,
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: '#181818',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandBlock: { flex: 1 },
  brand: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  signedIn: { color: '#AAA', fontSize: 12, marginTop: 4 },
  role: { color: '#EC2127', fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  compactActions: { gap: 8 },
  compactBrand: { fontSize: 14 },
  compactSignedIn: { fontSize: 10 },
  bellButton: { position: 'relative', padding: 5 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EC2127',
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  headerButton: { paddingVertical: 8 },
  profileText: { color: '#EC2127', fontWeight: 'bold' },
  logoutText: { color: '#AAA', fontWeight: 'bold' },
  sidebar: {
    width: 220,
    backgroundColor: '#181818',
    borderRightWidth: 1,
    borderRightColor: '#333',
    padding: 14,
  },
  sidebarTitle: {
    color: '#888',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  sidebarItems: { gap: 6 },
  sidebarItem: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tabBar: {
    backgroundColor: '#181818',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 7,
    minHeight: 62,
  },
  tabItems: { flexGrow: 1, justifyContent: 'space-around', paddingHorizontal: 4, gap: 2 },
  tabItem: {
    flex: 1,
    minWidth: 58,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  activeItem: { backgroundColor: '#2A1C1D' },
  itemIcon: { fontSize: 18 },
  itemLabel: { color: '#AAA', fontSize: 10, fontWeight: '600' },
  activeLabel: { color: '#EC2127' },
});
