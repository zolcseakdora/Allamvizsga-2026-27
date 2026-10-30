import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/src/screens/auth-screen';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';

import { AuthMode } from '@/src/types/auth';

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
  const [registrationCode, setRegistrationCode] = useState('');
  const [securePassword, setSecurePassword] = useState(true);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setTeamName('');
    setRegistrationCode('');
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
    if (!fullName.trim() || !email.trim() || !password) {
      return showToast(t('alerts.requiredFields'), 'error');
    }
    if (mode === AuthMode.REGISTER_CAPTAIN && (!registrationCode.trim() || !teamName.trim())) {
      return showToast(t('alerts.requiredFields'), 'error');
    }

    try {
      await register({
        name: fullName.trim(),
        email: email.trim(),
        password,
        ...(mode === AuthMode.REGISTER_CAPTAIN
          ? { team: teamName.trim(), registrationCode: registrationCode.trim() }
          : {}),
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
      registrationCode={registrationCode}
      email={email}
      password={password}
      securePassword={securePassword}
      onFullNameChange={setFullName}
      onTeamNameChange={setTeamName}
      onRegistrationCodeChange={setRegistrationCode}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onTogglePassword={() => setSecurePassword(!securePassword)}
      onSubmit={mode === AuthMode.LOGIN ? handleLogin : handleRegister}
      onSetMode={setMode}
    />
  );
}
