import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { canRole } from '@/src/constants/roles';
import { db } from '@/src/config/firebase';
import { createNotification, isLocallyCreatedNotification } from '@/src/services/notifications';
import { UserRole } from '@/src/types/auth';

export type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: Timestamp | null;
  createdBy: string;
  createdByName: string;
};

type NotificationsContextValue = {
  notifications: Notification[];
  unreadNotificationIds: ReadonlySet<string>;
  unreadCount: number;
  latestNotification: Notification | null;
  isLoading: boolean;
  canRead: boolean;
  canSend: boolean;
  error: string | null;
  markAllSeen: () => Promise<void>;
  sendNotification: (title: string, body: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user, profile } = useAuth();
  const canRead = Boolean(
    user && (profile?.isVerified === true || profile?.role === UserRole.FOSZERVEZO),
  );
  const canSend = canRole(profile?.role, 'sendNotifications');
  const [notificationData, setNotificationData] = useState<{
    uid: string;
    notifications: Notification[];
  } | null>(null);
  const [seenAtData, setSeenAtData] = useState<{ uid: string; seenAt: number | null } | null>(null);
  const [localSeenAtData, setLocalSeenAtData] = useState<{ uid: string; seenAt: number } | null>(null);
  const localSeenAtRef = useRef<{ uid: string; seenAt: number } | null>(null);
  const [errorData, setErrorData] = useState<{ uid: string; error: string } | null>(null);
  const seenNotificationIds = useRef<Set<string> | null>(null);
  const hasServerBaseline = useRef(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    return onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        const value: unknown = snapshot.data()?.notificationsSeenAt;
        setSeenAtData({
          uid: user.uid,
          seenAt: value instanceof Timestamp ? value.toMillis() : null,
        });
      },
      (snapshotError) => {
        setErrorData({ uid: user.uid, error: snapshotError.message });
      },
    );
  }, [user]);

  useEffect(() => {
    if (!user || !canRead) {
      seenNotificationIds.current = null;
      hasServerBaseline.current = false;
      return;
    }

    seenNotificationIds.current = null;
    hasServerBaseline.current = false;
    const notificationQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50),
    );

    return onSnapshot(
      notificationQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const nextNotifications = snapshot.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            title: typeof data.title === 'string' ? data.title : '',
            body: typeof data.body === 'string' ? data.body : '',
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
            createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
            createdByName: typeof data.createdByName === 'string' ? data.createdByName : '',
          };
        });

        const nextIds = new Set(nextNotifications.map((item) => item.id));
        if (hasServerBaseline.current && seenNotificationIds.current) {
          for (const notification of nextNotifications) {
            if (
              !seenNotificationIds.current.has(notification.id)
              && !isLocallyCreatedNotification(notification.id)
              && notification.title
            ) {
              showToast(t('notifications.newNotification', { title: notification.title }), 'info');
            }
          }
        }
        seenNotificationIds.current = nextIds;
        if (!snapshot.metadata.fromCache) hasServerBaseline.current = true;
        setNotificationData({ uid: user.uid, notifications: nextNotifications });
        setErrorData(null);
      },
      (snapshotError) => {
        setNotificationData({ uid: user.uid, notifications: [] });
        setErrorData({ uid: user.uid, error: snapshotError.message });
      },
    );
  }, [canRead, showToast, t, user]);

  const markAllSeen = useCallback(async () => {
    if (!user) return;
    const previousLocalSeenAt = localSeenAtRef.current?.uid === user.uid
      ? localSeenAtRef.current
      : null;
    const nextLocalSeenAt = { uid: user.uid, seenAt: Date.now() };
    localSeenAtRef.current = nextLocalSeenAt;
    setLocalSeenAtData(nextLocalSeenAt);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationsSeenAt: serverTimestamp(),
      });
    } catch (snapshotError) {
      localSeenAtRef.current = previousLocalSeenAt;
      setLocalSeenAtData(previousLocalSeenAt);
      throw snapshotError;
    }
  }, [user]);

  const sendNotification = useCallback(async (title: string, body: string) => {
    if (!canSend || !user) {
      throw new Error(t('notifications.notAllowedToSend'));
    }
    await createNotification(title, body, user.uid, profile?.name || user.displayName || '');
  }, [canSend, profile?.name, t, user]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!canSend) {
      throw new Error(t('notifications.notAllowedToDelete'));
    }
    await deleteDoc(doc(db, 'notifications', notificationId));
  }, [canSend, t]);

  const notifications = useMemo(
    () => canRead && user && notificationData?.uid === user.uid
      ? notificationData.notifications
      : [],
    [canRead, notificationData, user],
  );
  const isLoading = Boolean(
    canRead && user && notificationData?.uid !== user.uid,
  );
  const error = user && errorData?.uid === user.uid ? errorData.error : null;
  const effectiveSeenAt = user
    ? (localSeenAtData?.uid === user.uid ? localSeenAtData.seenAt : null)
      ?? (seenAtData?.uid === user.uid ? seenAtData.seenAt : null)
    : null;
  const unreadNotificationIds = useMemo(() => new Set(
    notifications
      .filter((notification) => (
        !notification.createdAt
        || effectiveSeenAt === null
        || notification.createdAt.toMillis() > effectiveSeenAt
      ))
      .map((notification) => notification.id),
  ), [effectiveSeenAt, notifications]);
  const unreadCount = useMemo(() => notifications.reduce((count, notification) => {
    if (!notification.createdAt) return count + 1;
    return effectiveSeenAt === null || notification.createdAt.toMillis() > effectiveSeenAt
      ? count + 1
      : count;
  }, 0), [effectiveSeenAt, notifications]);

  const value: NotificationsContextValue = {
    notifications,
    unreadNotificationIds,
    unreadCount,
    latestNotification: notifications[0] ?? null,
    isLoading,
    canRead,
    canSend,
    error,
    markAllSeen,
    sendNotification,
    deleteNotification,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
