import { collection, doc, getDocs, orderBy, query, addDoc, updateDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';

import { auth, db } from '@/src/config/firebase';
import { useAuth } from '@/src/context/AuthContext';
import { createNotification } from '@/src/services/notifications';
import { UserRole } from '@/src/types/auth';

export type RegisteredUser = {
  id: string;
  name?: string;
  role?: UserRole;
  igazolas?: string;
};

export type PendingUser = {
  id: string;
  name?: string;
  role?: UserRole;
  email?: string;
  team?: string;
  isVerified?: boolean;
  igazolas: string;
};

function toUserRole(value: unknown): UserRole | undefined {
  return Object.values(UserRole).find((role) => role === value);
}

export function useAdmin() {
  const { user, profile } = useAuth();
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);

  const refreshRegisteredUsers = useCallback(async () => {
    const snapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    setRegisteredUsers(snapshot.docs.map((item) => {
      const data = item.data();
      return { id: item.id, ...data, role: toUserRole(data.role) } as RegisteredUser;
    }));
  }, []);

  const refreshPendingUsers = useCallback(async () => {
    const snapshot = await getDocs(collection(db, 'users'));
    const pending: PendingUser[] = [];
    snapshot.docs.forEach((item) => {
      const data = item.data();
      if (typeof data.igazolas !== 'string') return;

      pending.push({
        id: item.id,
        name: typeof data.name === 'string' ? data.name : undefined,
        role: toUserRole(data.role),
        email: typeof data.email === 'string' ? data.email : undefined,
        team: typeof data.team === 'string' ? data.team : undefined,
        isVerified: data.isVerified === true,
        igazolas: data.igazolas,
      });
    });
    setPendingUsers(pending);
  }, []);

  const approveUser = useCallback(async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), { isVerified: true });
    await refreshPendingUsers();
  }, [refreshPendingUsers]);

  const addEvent = useCallback(async (event: { title: string; time: string; location: string; day: string }) => {
    await addDoc(collection(db, 'programs'), {
      title: event.title,
      time: event.time,
      helyszín: event.location,
      day: event.day,
      createdAt: new Date(),
      createdBy: auth.currentUser?.uid,
    });
  }, []);

  const sendNotification = useCallback(async (title: string, body: string) => {
    if (!user) throw new Error('A signed-in user is required to send notifications');
    await createNotification(title, body, user.uid, profile?.name || user.displayName || '');
  }, [profile?.name, user]);

  return {
    registeredUsers,
    pendingUsers,
    refreshRegisteredUsers,
    refreshPendingUsers,
    approveUser,
    addEvent,
    sendNotification,
  };
}
