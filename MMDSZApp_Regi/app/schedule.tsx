import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { ScheduleScreen } from '@/src/screens/schedule-screen';
import { useAuth } from '@/src/context/AuthContext';
import { useEventSeason } from '@/src/context/EventSeasonContext';
import { useSchedulePrograms } from '@/src/hooks/use-schedule-programs';
import { canRole } from '@/src/constants/roles';
import { goBackOrHome } from '@/src/utils/navigation';

export default function ScheduleRoute() {
  const router = useRouter();
  const { profile } = useAuth();
  const { eventType, edition } = useEventSeason();
  const { days, programs, refresh } = useSchedulePrograms();
  const [selectedCategory, setSelectedCategory] = useState('Szerda');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!days.length) return;
    const currentDay = days.find((day) => day.id === selectedCategory) ?? days[0];
    if (currentDay) setSelectedCategory(currentDay.id);
  }, [days, selectedCategory]);

  const isAdmin = canRole(profile?.role, 'manageAdmin');

  return (
    <ScheduleScreen
      programs={programs}
      days={days}
      selectedCategory={selectedCategory}
      isAdmin={isAdmin}
      onBack={() => goBackOrHome(router)}
      onRefresh={() => void refresh()}
      onSelectCategory={setSelectedCategory}
      onSelectProgram={(program) => {
        router.push({
          pathname: '/schedule/[programId]',
          params: { programId: program.id, dayId: program.dayId ?? '' },
        });
      }}
      onCreateProgram={() => router.push('/admin')}
    />
  );
}
