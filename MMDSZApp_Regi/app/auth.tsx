import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/src/screens/auth-screen';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';

export default function AuthRoute() {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [isLoginMode, setIsLoginMode] = useState(true);
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
    if (!email || !password) return showToast(t('alerts.emailPasswordRequired'), 'error');
    try {
      await login(email, password);
      router.replace('/'); 
    } catch {
      showToast(t('alerts.wrongCredentials'), 'error');
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password) return showToast(t('alerts.requiredFields'), 'error');
    try {
      await register({ name: fullName, email, password, team: teamName });
      router.replace('/');
    } catch (error: any) {
      showToast(t('alerts.generic', { message: error.message }), 'error');
    }
  };

  return (
    <AuthScreen
      isLoginMode={isLoginMode}
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
      onSubmit={isLoginMode ? handleLogin : handleRegister}
      onToggleMode={() => { setIsLoginMode(!isLoginMode); resetForm(); }}
    />
  );
}