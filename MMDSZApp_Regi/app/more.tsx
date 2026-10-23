import { MoreMenuScreen } from '@/src/components/app-navigation';
import { useAuth } from '@/src/context/AuthContext';

export default function MoreRoute() {
  const { profile } = useAuth();
  if (!profile) return null;
  return <MoreMenuScreen role={profile.role} />;
}
