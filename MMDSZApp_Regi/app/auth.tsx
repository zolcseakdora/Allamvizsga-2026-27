import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/src/screens/auth-screen';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { useEventSeason } from '@/src/context/EventSeasonContext';
import { normalizeTeamName } from '@/src/utils/team-name';

import { AuthMode } from '@/src/types/auth';

export default function AuthRoute() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const [mode, setMode] = useState<AuthMode>(
    invite === '1' ? AuthMode.REGISTER_INVITED : AuthMode.LOGIN
  );
  useEffect(() => {
    if (invite === '1') setMode(AuthMode.REGISTER_INVITED);
  }, [invite]);
  const { t } = useTranslation();
  const { login, register, registerForEvent } = useAuth();
  const { eventType } = useEventSeason();
  const { showToast } = useToast();
  const router = useRouter();

  const [isFebrutalisRegistrationMode, setIsFebrutalisRegistrationMode] = useState(false);
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
        invited: mode === AuthMode.REGISTER_INVITED || mode === AuthMode.REGISTER_MEMBER,
      });
      router.replace('/');
    } catch (error: any) {
      showToast(t('alerts.generic', { message: error.message }), 'error');
    }
  };

  return (
    <AuthScreen
      mode={mode}
      isFebrutalisRegistrationMode={isFebrutalisRegistrationMode}
      eventType={eventType}
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
      onSetMode={(nextMode) => { setMode(nextMode); resetForm(); }}
      onToggleFebrutalisRegistration={() => {
        setIsFebrutalisRegistrationMode((current) => !current);
        setTeamName('');
      }}
    />
  );
}
