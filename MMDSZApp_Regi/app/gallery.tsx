import { useRouter } from 'expo-router';

import { GalleryScreen } from '@/src/screens/gallery-screen';
import { goBackOrHome } from '@/src/utils/navigation';

export default function GalleryRoute() {
  const router = useRouter();

  return (
    <GalleryScreen
      selectedFolder={null}
      images={[]}
      onBack={() => goBackOrHome(router)}
      onRefresh={() => undefined}
      onSelectFolder={(folder) => router.push({ pathname: '/gallery/[folder]', params: { folder } })}
      onUploadImage={() => undefined}
      onSelectImage={() => undefined}
    />
  );
}
