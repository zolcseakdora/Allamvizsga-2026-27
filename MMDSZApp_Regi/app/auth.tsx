import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/src/screens/auth-screen';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';

import { AuthMode } from '@/src/types/auth';
import { UserRole } from '@/src/types/auth';

export default function AuthRoute() {
  const [mode, setMode] = useState<AuthMode>(AuthMode.LOGIN);
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [securePassword, setSecurePassword] = useState(true);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setTeamName('');
    setSecurePassword(true);
  };

  const handleLogin = async () => {
    if ( !email || !password ) return showToast(t('alerts.requiredFields'), 'error');

    try {
      await login(email, password);
      router.replace('/'); 
    } catch {
      showToast(t('alerts.wrongCredentials'), 'error');
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password  || !teamName) return showToast(t('alerts.requiredFields'), 'error');

    const assignedRole = mode === AuthMode.REGISTER_CAPTAIN 
      ? UserRole.CSAPATKAPITANY 
      : UserRole.CSAPATTAG;

    try {
      await register({ 
        name: fullName,
        email, password,
        team: teamName, 
        role: assignedRole
      });
      router.replace('/');
    } catch (error: any) {
      showToast(t('alerts.generic', { message: error.message }), 'error');
    }
  };

  return (
    <AuthScreen
      mode={mode}
      fullName={fullName}
      teamName={teamName}
      email={email}
      password={password}
      securePassword={securePassword}
      onFullNameChange={setFullName}
      onTeamNameChange={setTeamName}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onTogglePassword={() => setSecurePassword(!securePassword)}
      onSubmit={mode === AuthMode.LOGIN ? handleLogin : handleRegister}
      onSetMode={setMode}
    />
  );
}