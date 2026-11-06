import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/src/screens/auth-screen';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { AuthMode, UserRole } from '@/src/types/auth';

export default function TeamInviteRoute() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  
  const { teamId } = useLocalSearchParams<{ teamId: string }>();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securePassword, setSecurePassword] = useState(true);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      return showToast(t('alerts.requiredFields'), 'error');
    }
    
    try {
      await register({ 
        name: fullName, 
        email, 
        password, 
        team: teamId || '', 
        role: UserRole.CSAPATTAG 
      });
      
      router.replace('/');
    } catch (error: any) {
      showToast(t('alerts.generic', { message: error.message }), 'error');
    }
  };

  return (
    <AuthScreen
      mode={AuthMode.REGISTER_MEMBER}
      fullName={fullName}
      teamName={teamId || ''} 
      email={email}
      password={password}
      securePassword={securePassword}
      onFullNameChange={setFullName}
      onTeamNameChange={() => {}} 
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onTogglePassword={() => setSecurePassword(!securePassword)}
      onSubmit={handleRegister}
      onSetMode={(newMode) => {
        if (newMode === AuthMode.LOGIN) {
          router.replace('/auth');
        }
      }}
    />
  );
}