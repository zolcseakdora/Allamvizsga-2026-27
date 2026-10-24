import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AuthMode } from '../types/auth';

type AuthScreenProps = {
  mode: AuthMode;
  fullName: string;
  teamName: string;
  email: string;
  password: string;
  securePassword: boolean;
  onFullNameChange: (value: string) => void;
  onTeamNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
  onSetMode: (mode: AuthMode) => void;
};

export function AuthScreen({
  mode,
  fullName,
  teamName,
  email,
  password,
  securePassword,
  onFullNameChange,
  onTeamNameChange,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
  onSetMode,
}: AuthScreenProps) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>{t(mode === 'login'  ? 'auth.loginTitle' : 'auth.registerTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.appName')}</Text>

          {mode !== 'login' && (
            <>
              <TextInput style={styles.input} placeholder={t('auth.fullName')} placeholderTextColor="#888" value={fullName} onChangeText={onFullNameChange} />
              <TextInput style={styles.input} placeholder={t('auth.teamName')} placeholderTextColor="#888" value={teamName} onChangeText={onTeamNameChange} />
            </>
          )}
          <TextInput style={styles.input} placeholder={t('common.email')} placeholderTextColor="#888" keyboardType="email-address" value={email} onChangeText={onEmailChange} autoCapitalize="none" />
          <View style={styles.passwordContainer}>
            <TextInput style={styles.passwordInput} placeholder={t('common.password')} placeholderTextColor="#888" secureTextEntry={securePassword} value={password} onChangeText={onPasswordChange} />
            <TouchableOpacity onPress={onTogglePassword} style={styles.eyeIconContainer}>
              <Text>👁️</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.solidButton} onPress={onSubmit}>
            <Text style={styles.solidButtonText}>{t(mode === 'login' ? 'auth.login' : 'auth.register')}</Text>
          </TouchableOpacity>

        <View style={styles.toggleMode}>
            {mode !== 'login' && (
              <TouchableOpacity onPress={() => onSetMode('login')}>
                <Text style={styles.toggleModeText}>Back to Login</Text>
              </TouchableOpacity>
            )}
            {mode === 'login' && (
              <>
                <TouchableOpacity onPress={() => onSetMode('register_captain')} style={{ marginBottom: 10 }}>
                  <Text style={styles.toggleModeText}>Register as Team Captain</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onSetMode('register_member')}>
                  <Text style={styles.toggleModeText}>Register as Team Member</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 450, flex: 1, padding: 20, justifyContent: 'center' },
  scrollContainer: { flexGrow: 1, paddingVertical: 20 },
  logo: { width: 100, height: 100, marginBottom: 16, alignSelf: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center', letterSpacing: 1 },
  subtitle: { fontSize: 13, color: '#aaa', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#1E1E1E', color: '#FFF' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#333', borderRadius: 8, marginBottom: 12, backgroundColor: '#1E1E1E' },
  passwordInput: { flex: 1, padding: 12, color: '#FFF' },
  eyeIconContainer: { paddingHorizontal: 12 },
  solidButton: { backgroundColor: '#EC2127', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  solidButtonText: { color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
  toggleMode: { marginTop: 25, alignItems: 'center' },
  toggleModeText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
});