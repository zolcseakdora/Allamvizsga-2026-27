import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { useFocusEffect, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { db } from '@/src/config/firebase';
import { useToast } from '@/src/context/ToastContext';
import { useAuth } from '@/src/context/AuthContext';
import { useAdmin } from '@/src/hooks/use-admin';
import { useNotifications } from '@/src/hooks/use-notifications';
import { navigationItemsForRole, type NavigationItem } from '@/src/constants/roles';
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

function openNavigationItem(
  item: NavigationItem,
  router: ReturnType<typeof useRouter>,
  logout: () => Promise<void>,
) {
  if (item.action === 'logout') {
    void logout();
  } else if (item.route) {
    if (item.params) {
      router.push({ pathname: item.route, params: item.params });
    } else if (item.modal) {
      router.push(item.route);
    } else if (item.navigation === 'push') {
      router.push(item.route);
    } else {
      router.replace(item.route);
    }
  }
}

function NavigationLink({
  item,
  sidebar = false,
  list = false,
  active = false,
  badge,
  onPress,
}: {
  item: NavigationItem;
  sidebar?: boolean;
  list?: boolean;
  active?: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      style={[
        sidebar ? styles.sidebarItem : list ? styles.moreMenuItem : styles.moreItem,
        active && (sidebar ? styles.sidebarActiveItem : styles.activeItem),
      ]}
    >
      <Text style={[styles.itemIcon, sidebar && styles.sidebarIcon]}>{item.icon}</Text>
      <Text
        style={[
          styles.itemLabel,
          sidebar && styles.sidebarLabel,
          list && styles.moreLabel,
          active && styles.activeLabel,
        ]}
        numberOfLines={1}
      >
        {t(item.labelKey)}
      </Text>
      {badge !== undefined && badge > 0 && (
        <View style={styles.itemBadge}>
          <Text style={styles.itemBadgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function AppNavigationHeader({ role }: { role: UserRole }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { logout, profile } = useAuth();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return (
    <View
      style={[
        styles.header,
        width >= 900 && styles.desktopHeader,
        {
          paddingTop: width < 900 ? insets.top : insets.top + 8,
          paddingBottom: width < 900 ? 8 : 10,
          paddingHorizontal: width < 600 ? 10 : 22,
          ...(width < 900 ? { minHeight: insets.top + 56, flexWrap: 'nowrap' as const } : {}),
        },
      ]}
    >
      <Pressable
        style={styles.brandBlock}
        onPress={() => router.replace('/')}
        accessibilityRole="link"
      >
        <Text style={[styles.brand, width < 600 && styles.compactBrand]} numberOfLines={1}>
          {t('navigation.brand')}
        </Text>
      </Pressable>
      <View
        style={[
          styles.headerActions,
          width < 600 && styles.compactActions,
        ]}
      >
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
        <Pressable
          onPress={() => router.push('/profile')}
          style={[styles.profileAction, width >= 900 && styles.desktopProfileAction]}
          accessibilityRole="button"
          accessibilityLabel={`${profile?.name || t('home.profile')}, ${translatedRole(role, t)}`}
        >
          {profile?.profileImage ? (
            <Image source={{ uri: profile.profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person-outline" size={18} color="#FFFFFF" />
            </View>
          )}
          {width >= 900 && (
            <View style={[styles.profileLabels, styles.desktopProfileLabels]}>
              <Text style={[styles.profileName, width >= 900 && styles.desktopProfileName]} numberOfLines={1}>
                {profile?.name || t('home.profile')}
              </Text>
              <Text style={styles.desktopRoleBadge} numberOfLines={1}>
                {translatedRole(role, t)}
              </Text>
            </View>
          )}
        </Pressable>
        {width >= 900 && (
          <Pressable onPress={() => void logout()} style={styles.headerButton}>
            <Text style={styles.logoutText}>{t('common.logout')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function AppNavigation({ role, sidebar = false }: { role: UserRole; sidebar?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const { unreadCount } = useNotifications();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const tabItems = navigationItemsForRole(role, 'tab');
  const mainItems = navigationItemsForRole(role, 'main');
  const organizingItems = navigationItemsForRole(role, 'organizing');

  useEffect(() => {
    if (role !== UserRole.FOSZERVEZO || !sidebar) {
      setPendingApprovalsCount(0);
      return;
    }

    return onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const count = snapshot.docs.filter((user) => {
          const data = user.data();
          return typeof data.igazolas === 'string' && data.isVerified !== true;
        }).length;
        setPendingApprovalsCount(count);
      },
      (error) => {
        showToast(t('alerts.generic', { message: error.message }), 'error');
      },
    );
  }, [role, showToast, sidebar, t]);

  const isActive = (item: NavigationItem) => Boolean(
    item.route && (
      pathname === item.route
      || pathname.startsWith(`${item.route}/`)
      || (item.key === 'games' && pathname === '/photo-hunt')
    ),
  );

  if (sidebar) {
    return (
      <View style={styles.sidebar}>
        <ScrollView contentContainerStyle={styles.sidebarContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sidebarTitle}>{t('navigation.mainGroup')}</Text>
          {mainItems.map((item) => (
            <NavigationLink
              key={item.key}
              item={item}
              sidebar
              active={isActive(item)}
              badge={item.key === 'notifications' ? unreadCount : undefined}
              onPress={() => openNavigationItem(item, router, logout)}
            />
          ))}
          {organizingItems.length > 0 && (
            <>
              <Text style={styles.sidebarTitle}>{t('navigation.organizingGroup')}</Text>
              {organizingItems.map((item) => (
                <NavigationLink
                  key={item.key}
                  item={item}
                  sidebar
                  active={isActive(item)}
                  badge={item.key === 'admin' ? pendingApprovalsCount : undefined}
                  onPress={() => openNavigationItem(item, router, logout)}
                />
              ))}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  const moreItem: NavigationItem = {
    key: 'more',
    labelKey: 'navigation.more',
    route: '/more',
    icon: '☰',
    roles: [],
    mobile: 'tab',
    desktop: 'main',
  };
  const moreActive = pathname === '/more'
    || navigationItemsForRole(role, 'more').some((item) => isActive(item));

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          minHeight: 55 + Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.tabItems}>
        {tabItems.map((item) => (
          <NavigationLink
            key={item.key}
            item={item}
            active={isActive(item)}
            onPress={() => openNavigationItem(item, router, logout)}
          />
        ))}
        <NavigationLink
          item={moreItem}
          active={moreActive}
          onPress={() => router.replace('/more')}
        />
      </View>
    </View>
  );
}

export function MoreMenuScreen({ role }: { role: UserRole }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const { pendingUsers, refreshPendingUsers } = useAdmin();
  const pendingApprovalsCount = pendingUsers.filter((user) => !user.isVerified).length;
  const items = navigationItemsForRole(role, 'more');

  useFocusEffect(useCallback(() => {
    if (role !== UserRole.FOSZERVEZO) return undefined;

    let isFocused = true;
    void refreshPendingUsers().catch((error: unknown) => {
      if (!isFocused) return;
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
    });
    return () => {
      isFocused = false;
    };
  }, [refreshPendingUsers, role, showToast, t]));

  return (
    <View style={styles.moreScreen}>
      <ScrollView contentContainerStyle={styles.moreContent}>
        <Text style={styles.moreTitle}>{t('navigation.more')}</Text>
        {items.map((item) => (
          <NavigationLink
            key={item.key}
            item={item}
            list
            badge={item.key === 'admin' ? pendingApprovalsCount : undefined}
            onPress={() => openNavigationItem(item, router, logout)}
          />
        ))}
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
  desktopHeader: { backgroundColor: '#101010', borderBottomColor: '#EC2127' },
  brandBlock: { flex: 1, minWidth: 0, justifyContent: 'center' },
  brand: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  compactBrand: { fontSize: 13 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  compactActions: { gap: 7 },
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
  itemBadge: {
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    marginLeft: 'auto',
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EC2127',
  },
  itemBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  profileAction: { flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: 210, flexShrink: 0 },
  desktopProfileAction: { gap: 9, maxWidth: 320 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#333' },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLabels: { maxWidth: 155 },
  desktopProfileLabels: { maxWidth: 230, flexShrink: 0 },
  profileName: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  desktopProfileName: { fontSize: 14, fontWeight: '800' },
  desktopRoleBadge: {
    alignSelf: 'flex-start',
    color: '#FFF',
    backgroundColor: '#B8171D',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  headerButton: { paddingVertical: 8 },
  logoutText: { color: '#AAA', fontWeight: 'bold', fontSize: 12 },
  sidebar: {
    width: 240,
    flexShrink: 0,
    backgroundColor: '#181818',
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  sidebarContent: { padding: 14, paddingBottom: 24 },
  sidebarTitle: {
    color: '#888',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sidebarItem: {
    minHeight: 42,
    paddingHorizontal: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarIcon: { fontSize: 22 },
  sidebarLabel: { fontSize: 15, fontWeight: '600' },
  tabBar: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: '#181818',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 7,
    minHeight: 62,
  },
  tabItems: { height: 48, flexDirection: 'row', width: '100%', justifyContent: 'space-around', paddingHorizontal: 2, gap: 0 },
  moreItem: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 1,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  activeItem: { backgroundColor: '#2A1C1D' },
  sidebarActiveItem: { backgroundColor: '#321719', borderLeftWidth: 3, borderLeftColor: '#EC2127' },
  itemIcon: { fontSize: 18 },
  itemLabel: { color: '#AAA', fontSize: 10, fontWeight: '600' },
  activeLabel: { color: '#EC2127' },
  moreLabel: { fontSize: 15, fontWeight: '600' },
  moreMenuItem: {
    minHeight: 52,
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  moreScreen: { flex: 1, backgroundColor: '#121212', width: '100%' },
  moreContent: { padding: 20, paddingBottom: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  moreTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 22, marginBottom: 16 },
});
