import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ProgramDetailsScreen } from '@/src/screens/program-details-screen';
import { useAuth } from '@/src/context/AuthContext';
import { usePrograms } from '@/src/hooks/use-programs';
import type { Program } from '@/src/types/program';

export default function ProgramDetailsRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { profile } = useAuth();
  const { getProgram, deleteProgram } = usePrograms();
  const [program, setProgram] = useState<Program | null>(null);

  useEffect(() => {
    if (!programId) return;

    let isActive = true;
    void getProgram(programId).then((nextProgram) => {
      if (isActive) setProgram(nextProgram);
    });

    return () => {
      isActive = false;
    };
  }, [getProgram, programId]);

  const isAdmin = profile?.role === 'Szervező' || profile?.role === 'Főszervező';

  if (!program) {
    return null;
  }

  return (
    <ProgramDetailsScreen
      program={program}
      isAdmin={isAdmin}
      onBack={() => router.back()}
      onDelete={(id) => {
        void deleteProgram(id)
          .then(() => router.back())
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            Alert.alert(t('alerts.generic', { message }));
          });
      }}
    />
  );
}
