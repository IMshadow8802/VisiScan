import Constants from 'expo-constants';
import Reactotron from 'reactotron-react-native';

// Dev only (required behind __DEV__). On a real phone "localhost" is the phone itself, so
// connect to the Mac that serves the bundle: Metro's host, or EXPO_PUBLIC_REACTOTRON_HOST.
const host = process.env.EXPO_PUBLIC_REACTOTRON_HOST?.trim() || Constants.expoConfig?.hostUri?.split(':')[0] || 'localhost';

Reactotron.configure({ name: 'VisiScan', host }).useReactNative().connect();

// console.tron.log(...) anywhere for a quick look in the Reactotron timeline
(console as any).tron = Reactotron;

// Reactotron's networking plugin only hooks XMLHttpRequest, but Expo SDK 58 swaps the global
// fetch for its native expo/fetch, so no call would show up. Report each fetch ourselves.
const nativeFetch = globalThis.fetch;
const describeBody = (b: unknown) =>
  b == null ? null : typeof b === 'string' ? (b.length > 2000 ? `${b.slice(0, 2000)}… (${b.length} chars)` : b) : b instanceof FormData ? '[multipart form]' : '[binary]';

Object.defineProperty(globalThis, 'fetch', {
  configurable: true,
  writable: true,
  value: async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? 'GET';
    // never show the Gemini key in the timeline
    const headers = { ...(init?.headers as Record<string, string>) };
    if (headers['x-goog-api-key']) headers['x-goog-api-key'] = '***';
    const request = { url, method, data: describeBody(init?.body), headers, params: null };
    const t0 = Date.now();
    try {
      const res = await nativeFetch(input, init);
      const text = await res.clone().text().catch(() => '');
      Reactotron.apiResponse(request, { status: res.status, headers: {}, body: text.slice(0, 5000) }, Date.now() - t0);
      return res;
    } catch (e) {
      Reactotron.apiResponse(request, { status: 0, headers: {}, body: String((e as Error)?.message ?? e) }, Date.now() - t0);
      throw e;
    }
  },
});
