
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AuthMode } from '../types/auth';

type AuthScreenProps = {
  mode: AuthMode;
  fullName: string;
  teamName: string;
  registrationCode?: string;
  email: string;
  password: string;
  securePassword: boolean;
  onFullNameChange: (value: string) => void;
  onTeamNameChange: (value: string) => void;
  onRegistrationCodeChange?: (value: string) => void;
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
  registrationCode,
  email,
  password,
  securePassword,
  onFullNameChange,
  onTeamNameChange,
  onRegistrationCodeChange,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
  onSetMode,
}: AuthScreenProps) {
  const { t, i18n } = useTranslation();

  // Az aktuálisan kiválasztott nyelv ellenőrzése
  const isHungarian = i18n.language.startsWith('hu');

  // A regisztrációs szerepkör neve
  const getRole = () => {
    switch (mode) {
      case AuthMode.REGISTER_CAPTAIN:
        return t('auth.roleCaptain');

      case AuthMode.REGISTER_MEMBER:
      case AuthMode.REGISTER_INVITED:
        return t('auth.roleInvited');

      case AuthMode.REGISTER_ORGANIZER:
        return t('auth.roleOrganizer');

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* MMDSZ logó */}
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Bejelentkezés vagy regisztráció címe */}
          <Text style={styles.title}>
            {t(
              mode === AuthMode.LOGIN
                ? 'auth.loginTitle'
                : 'auth.registerTitle'
            )}
          </Text>

          {/* Regisztráció esetén a szerepkör */}
          {mode !== AuthMode.LOGIN && (
            <Text style={styles.role}>{getRole()}</Text>
          )}

          <Text style={styles.subtitle}>
            {t('auth.appName')}
          </Text>

          {/* Regisztrációs mezők */}
          {mode !== AuthMode.LOGIN && (
            <>
              <TextInput
                style={styles.input}
                placeholder={t('auth.fullName')}
                placeholderTextColor="#888"
                value={fullName}
                onChangeText={onFullNameChange}
              />

              {/* Csapatkapitány regisztráció */}
              {mode === AuthMode.REGISTER_CAPTAIN && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.registrationCode')}
                    placeholderTextColor="#888"
                    value={registrationCode ?? ''}
                    onChangeText={onRegistrationCodeChange}
                    autoCapitalize="characters"
                  />

                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.teamName')}
                    placeholderTextColor="#888"
                    value={teamName}
                    onChangeText={onTeamNameChange}
                  />
                </>
              )}

              {/* Meghívott csapattag regisztráció */}
              {(mode === AuthMode.REGISTER_MEMBER || mode === AuthMode.REGISTER_INVITED) && (
                <Text style={styles.hint}>{t('auth.invitedRegistrationHint')}</Text>
              )}
            </>
          )}

          {/* E-mail cím */}
          <TextInput
            style={styles.input}
            placeholder={t('common.email')}
            placeholderTextColor="#888"
            keyboardType="email-address"
            value={email}
            onChangeText={onEmailChange}
            autoCapitalize="none"
          />

          {/* Jelszó */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder={t('common.password')}
              placeholderTextColor="#888"
              secureTextEntry={securePassword}
              value={password}
              onChangeText={onPasswordChange}
            />

            <TouchableOpacity
              onPress={onTogglePassword}
              style={styles.eyeIconContainer}
            >
              <Text>👁️</Text>
            </TouchableOpacity>
          </View>

          {/* Bejelentkezés / regisztráció gomb */}
          <TouchableOpacity
            style={styles.solidButton}
            onPress={onSubmit}
          >
            <Text style={styles.solidButtonText}>
              {t(
                mode === AuthMode.LOGIN
                  ? 'auth.login'
                  : 'auth.register'
              )}
            </Text>
          </TouchableOpacity>

          {/* Nyelvfüggő navigáció */}
          <View style={styles.toggleMode}>

            {/* Vissza a bejelentkezéshez */}
            {mode !== AuthMode.LOGIN && (
              <TouchableOpacity
                onPress={() => onSetMode(AuthMode.LOGIN)}
              >
                <Text style={styles.toggleModeText}>
                  {isHungarian
                    ? 'Vissza a bejelentkezéshez'
                    : 'Back to Login'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Regisztráció csapatkapitányként */}
            {mode === AuthMode.LOGIN && (
              <TouchableOpacity
                onPress={() =>
                  onSetMode(AuthMode.REGISTER_CAPTAIN)
                }
              >
                <Text style={styles.toggleModeText}>
                  {isHungarian
                    ? 'Regisztráció csapatkapitányként'
                    : 'Register as Team Captain'}
                </Text>
              </TouchableOpacity>
            )}
            {mode === AuthMode.LOGIN && (
              <TouchableOpacity
                onPress={() => onSetMode(AuthMode.REGISTER_INVITED)}
                style={{ marginTop: 18 }}
              >
                <Text style={styles.toggleModeText}>
                  {t('auth.registerWithInvitation')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },

  webWrapper: {
    width: '100%',
    maxWidth: 450,
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },

  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 20,
  },

  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
    alignSelf: 'center',
  },

  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 1,
  },

  role: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EC2127',
    marginBottom: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  subtitle: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 20,
    textAlign: 'center',
  },

  hint: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 12,
    textAlign: 'center',
  },

  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#1E1E1E',
    color: '#FFF',
  },

  disabledInput: {
    backgroundColor: '#2A2A2A',
    color: '#888',
    borderColor: '#444',
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#1E1E1E',
  },

  passwordInput: {
    flex: 1,
    padding: 12,
    color: '#FFF',
  },

  eyeIconContainer: {
    paddingHorizontal: 12,
  },

  solidButton: {
    backgroundColor: '#EC2127',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },

  solidButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },

  toggleMode: {
    marginTop: 25,
    alignItems: 'center',
  },

  toggleModeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
