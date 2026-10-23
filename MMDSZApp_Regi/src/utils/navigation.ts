import type { ImperativeRouter } from 'expo-router';

type BackCapableRouter = Pick<ImperativeRouter, 'back' | 'canGoBack' | 'replace'>;

export function goBackOrHome(router: BackCapableRouter) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}
