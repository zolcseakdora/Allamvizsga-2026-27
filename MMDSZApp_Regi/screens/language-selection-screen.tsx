import { Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type LanguageSelectionScreenProps = {
  onSelectLanguage: (language: 'hu' | 'en') => void;
};

export function LanguageSelectionScreen({ onSelectLanguage }: LanguageSelectionScreenProps) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <Image source={require('../app/(tabs)/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>{t('language.title')}</Text>
        <TouchableOpacity style={styles.outlineButton} onPress={() => onSelectLanguage('hu')}>
          <Text style={styles.outlineButtonText}>{t('language.hungarian')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineButton} onPress={() => onSelectLanguage('en')}>
          <Text style={styles.outlineButtonText}>{t('language.english')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 450, flex: 1, padding: 20, justifyContent: 'center' },
  logo: { width: 100, height: 100, marginBottom: 16, alignSelf: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center', letterSpacing: 1 },
  outlineButton: { borderWidth: 2, borderColor: '#EC2127', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center', marginBottom: 14, backgroundColor: '#1E1E1E' },
  outlineButtonText: { color: '#FFF', fontWeight: 'bold' },
});