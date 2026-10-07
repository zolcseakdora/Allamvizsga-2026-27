import { collection, doc, getDocs, orderBy, query, addDoc, updateDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';

import { auth, db } from '@/src/config/firebase';

export type RegisteredUser = {
  id: string;
  name?: string;
  role?: string;
  igazolas?: string;
};

export type PendingUser = {
  id: string;
  name?: string;
  role?: string;
  email?: string;
  team?: string;
  isVerified?: boolean;
  igazolas: string;
};

export function useAdmin() {
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);

  const refreshRegisteredUsers = useCallback(async () => {
    const snapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    setRegisteredUsers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as RegisteredUser[]);
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
        role: typeof data.role === 'string' ? data.role : undefined,
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
    await addDoc(collection(db, 'notifications'), { title, body, createdAt: new Date() });
  }, []);

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
