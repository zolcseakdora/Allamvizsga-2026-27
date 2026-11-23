import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { Notification } from '@/src/hooks/use-notifications';

type NotificationsScreenProps = {
  notifications: Notification[];
  unreadNotificationIds: ReadonlySet<string>;
  canRead: boolean;
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
};

function formatTime(notification: Notification, locale: string, pendingLabel: string) {
  if (!notification.createdAt) return pendingLabel;
  return notification.createdAt.toDate().toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function NotificationsScreen({
  notifications,
  unreadNotificationIds,
  canRead,
  isLoading,
  error,
  onBack,
}: NotificationsScreenProps) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.headerRow}>
          {width < 900 && <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>}
        </View>
        <Text style={styles.title}>🔔 {t('notifications.title')}</Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {!canRead ? (
            <Text style={styles.message}>{t('notifications.approvalRequired')}</Text>
          ) : isLoading ? (
            <Text style={styles.message}>{t('common.loading')}</Text>
          ) : error ? (
            <Text style={styles.error}>{t('notifications.loadError', { message: error })}</Text>
          ) : notifications.length === 0 ? (
            <Text style={styles.message}>{t('notifications.empty')}</Text>
          ) : (
            notifications.map((notification) => {
              const unread = unreadNotificationIds.has(notification.id);
              return (
                <View
                  key={notification.id}
                  style={[styles.notificationCard, unread && styles.unreadCard]}
                >
                  <View style={styles.notificationHeader}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    {unread && <Text style={styles.unreadBadge}>{t('notifications.unread')}</Text>}
                  </View>
                  <Text style={styles.notificationBody}>{notification.body}</Text>
                  <Text style={styles.meta}>
                    {t('notifications.sentAt', {
                      time: formatTime(notification, i18n.language, t('notifications.sendingTime')),
                    })}
                  </Text>
                  <Text style={styles.meta}>
                    {t('notifications.sentBy', { name: notification.createdByName || t('notifications.unknownSender') })}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 600, flex: 1, padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  backText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 21, fontWeight: 'bold', color: '#EC2127', marginVertical: 15, textAlign: 'center' },
  scroll: { width: '100%' },
  notificationCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 15, marginBottom: 12 },
  unreadCard: { borderColor: '#EC2127', borderLeftWidth: 5 },
  notificationHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  notificationTitle: { flex: 1, color: '#FFF', fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  unreadBadge: { color: '#FFF', backgroundColor: '#EC2127', overflow: 'hidden', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: 'bold' },
  notificationBody: { color: '#DDD', fontSize: 14, lineHeight: 21, marginBottom: 12 },
  meta: { color: '#999', fontSize: 12, marginTop: 3 },
  message: { color: '#AAA', textAlign: 'center', marginVertical: 25 },
  error: { color: '#EC2127', textAlign: 'center', marginVertical: 25 },
});
