import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Notification } from '@/src/hooks/use-notifications';

type NotificationsScreenProps = {
  notifications: Notification[];
  unreadNotificationIds: ReadonlySet<string>;
  canRead: boolean;
  canSend: boolean;
  isLoading: boolean;
  error: string | null;
  title: string;
  body: string;
  isSending: boolean;
  onBack: () => void;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSend: () => void;
  onDelete: (notification: Notification) => void;
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
  canSend,
  isLoading,
  error,
  title,
  body,
  isSending,
  onBack,
  onTitleChange,
  onBodyChange,
  onSend,
  onDelete,
}: NotificationsScreenProps) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
          {canSend && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('notifications.composeTitle')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('notifications.titlePlaceholder')}
                placeholderTextColor="#888"
                value={title}
                onChangeText={onTitleChange}
                maxLength={120}
              />
              <TextInput
                style={styles.bodyInput}
                placeholder={t('notifications.bodyPlaceholder')}
                placeholderTextColor="#888"
                value={body}
                onChangeText={onBodyChange}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.sendButton, isSending && styles.disabledButton]}
                onPress={onSend}
                disabled={isSending}
              >
                <Text style={styles.buttonText}>
                  {isSending ? t('notifications.sending') : t('notifications.send')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

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
                  {canSend && (
                    pendingDeleteId === notification.id ? (
                      <View style={styles.deleteConfirmation}>
                        <Text style={styles.meta}>
                          {t('notifications.deleteConfirmation', { title: notification.title })}
                        </Text>
                        <View style={styles.deleteActions}>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setPendingDeleteId(null)}
                          >
                            <Text style={styles.meta}>{t('common.cancel')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => {
                              setPendingDeleteId(null);
                              onDelete(notification);
                            }}
                          >
                            <Text style={styles.deleteButtonText}>{t('notifications.delete')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => setPendingDeleteId(notification.id)}
                      >
                        <Text style={styles.deleteButtonText}>{t('notifications.delete')}</Text>
                      </TouchableOpacity>
                    )
                  )}
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
  card: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#444', borderRadius: 8, padding: 12, marginBottom: 10, color: '#FFF', backgroundColor: '#121212' },
  bodyInput: { minHeight: 100, borderWidth: 1, borderColor: '#444', borderRadius: 8, padding: 12, marginBottom: 12, color: '#FFF', backgroundColor: '#121212' },
  sendButton: { backgroundColor: '#EC2127', borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
  notificationCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 15, marginBottom: 12 },
  unreadCard: { borderColor: '#EC2127', borderLeftWidth: 5 },
  notificationHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  notificationTitle: { flex: 1, color: '#FFF', fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  unreadBadge: { color: '#FFF', backgroundColor: '#EC2127', overflow: 'hidden', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: 'bold' },
  notificationBody: { color: '#DDD', fontSize: 14, lineHeight: 21, marginBottom: 12 },
  meta: { color: '#999', fontSize: 12, marginTop: 3 },
  deleteButton: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, marginTop: 8, borderWidth: 1, borderColor: '#EC2127', borderRadius: 6 },
  deleteButtonText: { color: '#EC2127', fontWeight: 'bold' },
  deleteConfirmation: { marginTop: 8, padding: 10, backgroundColor: '#2A1A1A', borderRadius: 6 },
  deleteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  cancelButton: { paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 },
  message: { color: '#AAA', textAlign: 'center', marginVertical: 25 },
  error: { color: '#EC2127', textAlign: 'center', marginVertical: 25 },
});
