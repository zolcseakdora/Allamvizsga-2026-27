import { collection, deleteDoc, doc, getDoc, getDocs, query } from 'firebase/firestore';
import { useCallback, useState } from 'react';

import { db } from '@/src/config/firebase';
import type { Program } from '@/src/types/program';

function getFestivalTimeScore(time: string | undefined) {
  if (!time) return 99999;

  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 99999;

  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours < 7) hours += 24;

  return hours * 60 + minutes;
}

function toProgram(id: string, data: Record<string, unknown>): Program {
  return {
    id,
    title: typeof data.title === 'string' ? data.title : undefined,
    time: typeof data.time === 'string' ? data.time : undefined,
    helyszín: typeof data.helyszín === 'string' ? data.helyszín : undefined,
    day: typeof data.day === 'string' ? data.day : undefined,
    image: typeof data.image === 'string' ? data.image : undefined,
    description: typeof data.description === 'string' ? data.description : undefined,
  };
}

export function usePrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const snapshot = await getDocs(query(collection(db, 'programs')));
      const nextPrograms = snapshot.docs
        .map((program) => toProgram(program.id, program.data()))
        .sort((left, right) => getFestivalTimeScore(left.time) - getFestivalTimeScore(right.time));
      setPrograms(nextPrograms);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getProgram = useCallback(async (programId: string) => {
    const snapshot = await getDoc(doc(db, 'programs', programId));
    return snapshot.exists() ? toProgram(snapshot.id, snapshot.data()) : null;
  }, []);

  const deleteProgram = useCallback(async (programId: string) => {
    await deleteDoc(doc(db, 'programs', programId));
    setPrograms((currentPrograms) => currentPrograms.filter((program) => program.id !== programId));
  }, []);

  return { programs, isLoading, error, refresh, getProgram, deleteProgram };
}
