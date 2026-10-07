import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { ScheduleScreen } from '@/src/screens/schedule-screen';
import { useAuth } from '@/src/context/AuthContext';
import { usePrograms } from '@/src/hooks/use-programs';

export default function ScheduleRoute() {
  const router = useRouter();
  const { profile } = useAuth();
  const { programs, refresh } = usePrograms();
  const [selectedCategory, setSelectedCategory] = useState('Szerda');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isAdmin = profile?.role === 'Szervező' || profile?.role === 'Főszervező';

  return (
    <ScheduleScreen
      programs={programs}
      selectedCategory={selectedCategory}
      isAdmin={isAdmin}
      onBack={() => router.back()}
      onRefresh={() => void refresh()}
      onSelectCategory={setSelectedCategory}
      onSelectProgram={(program) => {
        router.push({ pathname: '/schedule/[programId]', params: { programId: program.id } });
      }}
    />
  );
}
