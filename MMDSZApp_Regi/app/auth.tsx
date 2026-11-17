import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/src/screens/auth-screen';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { useEventSeason } from '@/src/context/EventSeasonContext';
import { normalizeTeamName } from '@/src/utils/team-name';

export default function AuthRoute() {
  const { t } = useTranslation();
  const { login, register, registerForEvent } = useAuth();
  const { eventType } = useEventSeason();
  const { showToast } = useToast();
  const router = useRouter();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isFebrutalisRegistrationMode, setIsFebrutalisRegistrationMode] = useState(false);
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
    setIsFebrutalisRegistrationMode(false);
  };

  const handleLogin = async () => {
    if (!email || !password) return showToast(t('alerts.emailPasswordRequired'), 'error');
    const februtalisTeamName = normalizeTeamName(teamName);
    if (isFebrutalisRegistrationMode && (februtalisTeamName.length < 2 || februtalisTeamName.length > 60)) {
      return showToast(t('auth.teamNameRequired'), 'error');
    }
    try {
      await login(email, password);
      if (isFebrutalisRegistrationMode) {
        await registerForEvent('februtalis', februtalisTeamName);
        showToast(t('auth.februtalisRegistrationComplete'), 'success');
      }
      router.replace('/'); 
    } catch (error) {
      if (isFebrutalisRegistrationMode) {
        const message = error instanceof Error ? error.message : String(error);
        showToast(t('alerts.generic', { message }), 'error');
      } else {
        showToast(t('alerts.wrongCredentials'), 'error');
      }
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password) return showToast(t('alerts.requiredFields'), 'error');
    const registrationTeamName = normalizeTeamName(teamName);
    if (eventType === 'februtalis' && (registrationTeamName.length < 2 || registrationTeamName.length > 60)) {
      return showToast(t('auth.teamNameRequired'), 'error');
    }
    try {
      await register({ name: fullName, email, password, team: teamName, eventType });
      router.replace('/');
    } catch (error: any) {
      showToast(t('alerts.generic', { message: error.message }), 'error');
    }
  };

  return (
    <AuthScreen
      isLoginMode={isLoginMode}
      isFebrutalisRegistrationMode={isFebrutalisRegistrationMode}
      eventType={eventType}
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
      onToggleFebrutalisRegistration={() => {
        setIsFebrutalisRegistrationMode((current) => !current);
        setTeamName('');
      }}
      onToggleMode={() => { setIsLoginMode(!isLoginMode); resetForm(); }}
    />
  );
}