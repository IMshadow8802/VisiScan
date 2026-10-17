import Constants from 'expo-constants';
import Reactotron from 'reactotron-react-native';

// Dev only (required behind __DEV__). On a real phone "localhost" is the phone itself, so
// connect to the Mac that serves the bundle: Metro's host, or EXPO_PUBLIC_REACTOTRON_HOST.
const host = process.env.EXPO_PUBLIC_REACTOTRON_HOST?.trim() || Constants.expoConfig?.hostUri?.split(':')[0] || 'localhost';

Reactotron.configure({ name: 'VisiScan', host })
  .useReactNative({
    networking: { ignoreUrls: /symbolicate|logs|generate_204|\/status/ },
  })
  .connect();

// console.tron.log(...) anywhere for a quick look in the Reactotron timeline
(console as any).tron = Reactotron;
