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
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { colors } from '../theme/tokens';

SplashScreen.preventAutoHideAsync();

// Dev-only noise from react-native-screens: it forwards native-stack transition progress
// through core Animated even when nothing listens. Harmless; absent in release builds.
LogBox.ignoreLogs(['Sending `onAnimatedValueUpdate` with no listeners registered']);

export default function RootLayout() {
  const reduced = useReducedMotion();
  const [loaded, error] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

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
