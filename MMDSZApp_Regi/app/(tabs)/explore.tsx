import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

export default function TabTwoScreen() {
  const { t } = useTranslation();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          {t('explore.title')}
        </ThemedText>
      </ThemedView>
      <ThemedText>{t('explore.intro')}</ThemedText>
      <Collapsible title={t('explore.routingTitle')}>
        <ThemedText>{t('explore.routingBody', { homeScreen: 'app/(tabs)/index.tsx', exploreScreen: 'app/(tabs)/explore.tsx' })}</ThemedText>
        <ThemedText>{t('explore.layoutBody', { layout: 'app/(tabs)/_layout.tsx' })}</ThemedText>
        <ExternalLink href="https://docs.expo.dev/router/introduction">
          <ThemedText type="link">{t('explore.learnMore')}</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title={t('explore.platformTitle')}>
        <ThemedText>{t('explore.platformBody')}</ThemedText>
      </Collapsible>
      <Collapsible title={t('explore.imagesTitle')}>
        <ThemedText>{t('explore.imagesBody')}</ThemedText>
        <Image
          source={require('@/assets/images/react-logo.png')}
          style={{ width: 100, height: 100, alignSelf: 'center' }}
        />
        <ExternalLink href="https://reactnative.dev/docs/images">
          <ThemedText type="link">{t('explore.learnMore')}</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title={t('explore.appearanceTitle')}>
        <ThemedText>{t('explore.appearanceBody')}</ThemedText>
        <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
          <ThemedText type="link">{t('explore.learnMore')}</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title={t('explore.animationsTitle')}>
        <ThemedText>{t('explore.animationsBody')}</ThemedText>
        {Platform.select({
          ios: (
            <ThemedText>{t('explore.parallaxBody')}</ThemedText>
          ),
        })}
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
