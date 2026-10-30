import { ActivityIndicator, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ProgramDetailsScreen } from '@/src/screens/program-details-screen';
import { useAuth } from '@/src/context/AuthContext';
import { useSchedulePrograms } from '@/src/hooks/use-schedule-programs';
import { canRole } from '@/src/constants/roles';
import { goBackOrHome } from '@/src/utils/navigation';

export default function ProgramDetailsRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { programId, dayId } = useLocalSearchParams<{ programId: string; dayId?: string }>();
  const { profile } = useAuth();
  const { getProgram, getProgramImage, deleteProgram } = useSchedulePrograms();
  const [program, setProgram] = useState<{ id?: string; title?: string; time?: string; helyszín?: string; day?: string; image?: string; description?: string } | null>(null);
  const [programImage, setProgramImage] = useState<string>();
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isLoadingProgram, setIsLoadingProgram] = useState(true);

  useEffect(() => {
    if (!programId) {
      setIsLoadingProgram(false);
      return;
    }

    let isActive = true;
    setIsLoadingProgram(true);
    setProgram(null);
    setProgramImage(undefined);
    setIsImageLoading(false);
    void getProgram(programId, dayId || undefined)
      .then(async (nextProgram) => {
        if (!isActive) return;
        setProgram(nextProgram);
        if (!nextProgram || (!nextProgram.image && !nextProgram.thumb)) {
          setProgramImage(nextProgram?.image);
          setIsImageLoading(false);
          return;
        }
        setIsImageLoading(true);
        setProgramImage(nextProgram.image ?? nextProgram.thumb);
        try {
          const image = await getProgramImage(programId, dayId || undefined);
          if (isActive) setProgramImage(image ?? nextProgram.image ?? nextProgram.thumb);
        } catch (error) {
          if (!isActive) return;
          const message = error instanceof Error ? error.message : String(error);
          Alert.alert(t('alerts.generic', { message }));
        } finally {
          if (isActive) setIsImageLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : String(error);
        Alert.alert(t('alerts.generic', { message }));
      })
      .finally(() => {
        if (isActive) setIsLoadingProgram(false);
      });

    return () => {
      isActive = false;
    };
  }, [dayId, getProgram, getProgramImage, programId, t]);

  const isAdmin = canRole(profile?.role, 'manageAdmin');

  if (!program) {
    if (isLoadingProgram || isImageLoading) return <View style={{ flex: 1, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#EC2127" /></View>;
    return null;
  }

  return (
    <ProgramDetailsScreen
      program={program}
      image={programImage}
      isImageLoading={isImageLoading}
      isAdmin={isAdmin}
      onBack={() => goBackOrHome(router)}
      onEdit={(id) => router.push({ pathname: '/admin', params: { programId: id, dayId: dayId ?? '' } })}
      onDelete={(id) => {
        void deleteProgram(id, dayId || undefined)
          .then(() => goBackOrHome(router))
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            Alert.alert(t('alerts.generic', { message }));
          });
      }}
    />
  );
}
