import Constants from 'expo-constants';
import { NativeModules } from 'react-native';
import Reactotron from 'reactotron-react-native';

// Dev only (required behind __DEV__). On a real phone "localhost" is the phone itself, so
// connect to the Mac that serves the bundle. The bundle URL always names it; Expo's hostUri
// is often missing in dev-client builds.
const scriptURL: string | undefined =
  NativeModules.SourceCode?.getConstants?.().scriptURL ?? NativeModules.SourceCode?.scriptURL;
const host =
  process.env.EXPO_PUBLIC_REACTOTRON_HOST?.trim() ||
  (scriptURL?.startsWith('http') ? new URL(scriptURL).hostname : undefined) ||
  Constants.expoConfig?.hostUri?.split(':')[0] ||
  'localhost';
console.log(`[reactotron] connecting to ${host}:9090`);

// networking sees XMLHttpRequest, so every axios call (Gemini, saveCard, deleteCard) shows up
Reactotron.configure({ name: 'VisiScan', host })
  .useReactNative({ networking: { ignoreUrls: /symbolicate|logs|generate_204|\/status/ } })
  .connect();

// console.tron.log(...) anywhere for a quick look in the Reactotron timeline
(console as any).tron = Reactotron;
