import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';

type ProcessImageOptions = {
  maxSide: number;
  quality: number;
  maxBytes: number;
};

const MIN_SIDE = 128;
const FALLBACK_QUALITIES = [0.7, 0.6, 0.5, 0.4, 0.3];

export async function processImage(
  uri: string,
  { maxSide, quality, maxBytes }: ProcessImageOptions,
): Promise<{ dataUrl: string }> {
  const qualities = [...new Set([quality, ...FALLBACK_QUALITIES.filter(value => value < quality)])]
    .filter(value => value > 0 && value <= 1);
  const sizes: number[] = [];
  for (let side = maxSide; side >= MIN_SIDE; side = Math.floor(side * 0.8)) {
    if (sizes.at(-1) !== side) sizes.push(side);
    if (side === MIN_SIDE) break;
    if (Math.floor(side * 0.8) < MIN_SIDE) sizes.push(MIN_SIDE);
  }

  const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(uri, (imageWidth, imageHeight) => {
      resolve({ width: imageWidth, height: imageHeight });
    }, reject);
  });
  const originalMaxSide = Math.max(width, height);
  for (const targetSide of sizes) {
    const context = ImageManipulator.manipulate(uri);
    const resizedSide = Math.min(targetSide, originalMaxSide);
    if (resizedSide < originalMaxSide) {
      context.resize(width >= height
        ? { width: resizedSide }
        : { height: resizedSide });
    }
    const image = await context.renderAsync();

    for (const compression of qualities) {
      const result = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: compression,
        base64: true,
      });
      if (!result.base64) throw new Error('image-processing-failed');

      const dataUrl = `data:image/jpeg;base64,${result.base64}`;
      if (dataUrl.length <= maxBytes) return { dataUrl };
    }
  }

  throw new Error('image-too-large');
}

export function makeThumbnail(uri: string): Promise<{ dataUrl: string }> {
  return processImage(uri, { maxSide: 400, quality: 0.6, maxBytes: 40000 });
}
