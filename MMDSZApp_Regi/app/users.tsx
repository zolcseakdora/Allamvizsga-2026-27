import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { RegisteredUsersScreen } from '@/src/screens/registered-users-screen';
import { useAdmin } from '@/src/hooks/use-admin';

export default function RegisteredUsersRoute() {
  const router = useRouter();
  const { registeredUsers, refreshRegisteredUsers } = useAdmin();

  useEffect(() => {
    void refreshRegisteredUsers();
  }, [refreshRegisteredUsers]);

  return (
    <RegisteredUsersScreen
      users={registeredUsers}
      onBack={() => router.back()}
      onRefresh={() => void refreshRegisteredUsers()}
    />
  );
}
