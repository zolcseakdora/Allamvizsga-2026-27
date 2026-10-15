import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { ScheduleScreen } from '@/src/screens/schedule-screen';
import { useAuth } from '@/src/context/AuthContext';
import { usePrograms } from '@/src/hooks/use-programs';
import { canRole } from '@/src/constants/roles';
import { goBackOrHome } from '@/src/utils/navigation';

export default function ScheduleRoute() {
  const router = useRouter();
  const { profile } = useAuth();
  const { programs, refresh } = usePrograms();
  const [selectedCategory, setSelectedCategory] = useState('Szerda');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isAdmin = canRole(profile?.role, 'managePrograms');

  return (
    <ScheduleScreen
      programs={programs}
      selectedCategory={selectedCategory}
      isAdmin={isAdmin}
      onBack={() => goBackOrHome(router)}
      onRefresh={() => void refresh()}
      onSelectCategory={setSelectedCategory}
      onSelectProgram={(program) => {
        router.push({ pathname: '/schedule/[programId]', params: { programId: program.id } });
      }}
    />
  );
}
