import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ProgramDetailsScreen } from '@/src/screens/program-details-screen';
import { useAuth } from '@/src/context/AuthContext';
import { usePrograms } from '@/src/hooks/use-programs';
import type { Program } from '@/src/types/program';
import { canRole } from '@/src/constants/roles';
import { goBackOrHome } from '@/src/utils/navigation';

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

  const isAdmin = canRole(profile?.role, 'managePrograms');

  if (!program) {
    return null;
  }

  return (
    <ProgramDetailsScreen
      program={program}
      isAdmin={isAdmin}
      onBack={() => goBackOrHome(router)}
      onDelete={(id) => {
        void deleteProgram(id)
          .then(() => goBackOrHome(router))
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            Alert.alert(t('alerts.generic', { message }));
          });
      }}
    />
  );
}
