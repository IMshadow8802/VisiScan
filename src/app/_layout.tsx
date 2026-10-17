import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, Dimensions, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { syncNow } from '../lib/sync';
import { colors } from '../theme/tokens';

// require, not import: release builds drop it entirely
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (__DEV__) require('../lib/reactotron');

SplashScreen.preventAutoHideAsync();

// Phones stay portrait (landscape leaves no room for the deck); tablets rotate freely.
// 600 = Android's sw600dp tablet line; the smallest iPad is 744pt wide.
const { width: sw, height: sh } = Dimensions.get('screen');
if (Math.min(sw, sh) < 600) ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});

// Dev-only noise, absent in release builds: react-native-screens forwards transition progress
// through core Animated, and RN's WebSocket (Reactotron's link) emits before anyone listens.
LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered',
  'Sending `websocketMessage` with no listeners registered',
]);

export default function RootLayout() {
  const reduced = useReducedMotion();
  const [loaded, error] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  // push unsynced cards on launch and whenever the app comes back to the foreground
  useEffect(() => {
    syncNow();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && syncNow());
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper }, animation: reduced ? 'fade' : 'slide_from_right' }}>
        <Stack.Screen name="scan" options={{ animation: reduced ? 'fade' : 'fade_from_bottom' }} />
        <Stack.Screen name="review" options={{ animation: reduced ? 'fade' : 'fade_from_bottom' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
