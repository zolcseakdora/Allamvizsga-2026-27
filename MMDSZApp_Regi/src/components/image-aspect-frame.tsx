import { Image as ReactNativeImage, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useEffect, useState } from 'react';

type ImageSource = number | { uri: string };

type ImageAspectFrameProps = {
  source: ImageSource;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_ASPECT_RATIO = 4 / 5;
const MIN_ASPECT_RATIO = 4 / 5;
const MAX_ASPECT_RATIO = 16 / 9;

function clampAspectRatio(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return DEFAULT_ASPECT_RATIO;
  }

  return Math.min(MAX_ASPECT_RATIO, Math.max(MIN_ASPECT_RATIO, width / height));
}

export function ImageAspectFrame({ source, style }: ImageAspectFrameProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);
  const assetId = typeof source === 'number' ? source : null;
  const uri = typeof source === 'number' ? null : source.uri;

  useEffect(() => {
    let isActive = true;
    setAspectRatio(DEFAULT_ASPECT_RATIO);

    if (assetId !== null) {
      const asset = ReactNativeImage.resolveAssetSource(assetId);
      if (asset?.width && asset.height && isActive) {
        setAspectRatio(clampAspectRatio(asset.width, asset.height));
      }
    } else if (uri) {
      ReactNativeImage.getSize(
        uri,
        (imageWidth, imageHeight) => {
          if (isActive) {
            setAspectRatio(clampAspectRatio(imageWidth, imageHeight));
          }
        },
        () => {
          if (isActive) {
            setAspectRatio(DEFAULT_ASPECT_RATIO);
          }
        },
      );
    }

    return () => {
      isActive = false;
    };
  }, [assetId, uri]);

  return (
    <View
      style={[
        styles.frame,
        { aspectRatio, maxHeight: windowWidth >= 900 ? 420 : undefined },
        style,
      ]}
    >
      <ExpoImage source={source} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
  },
});
