import Storage from 'expo-sqlite/kv-store';

export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
export type ViewMode = 'stack' | 'list';

// ponytail: key is bundled from .env.local (user decision: many testers, nobody pastes keys).
// Anyone with the APK can extract it — restrict the key in Google Cloud and rotate after testing.
// Expo only inlines literal `process.env.EXPO_PUBLIC_*` access, keep it that way.
export const getApiKey = async () => process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() || null;
export const getClaudeKey = async () => process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY?.trim() || null;
export const getModel = async () => process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim() || DEFAULT_MODEL;

export const getViewMode = async (): Promise<ViewMode> =>
  (await Storage.getItem('viewMode')) === 'list' ? 'list' : 'stack';
export const setViewMode = (m: ViewMode) => Storage.setItem('viewMode', m);

// ---- CRM session: signed in once, kept until sign out or a 401 ----

// companyName optional: sessions saved before it was added still load
export type Session = { apiBase: string; token: string; userName: string; companyName?: string };

const readSession = (): Session | null => {
  try {
    const s = JSON.parse(Storage.getItemSync('session') ?? 'null');
    return s?.apiBase && s?.token ? s : null;
  } catch {
    return null;
  }
};

// sync read at startup, so the first render already knows whether to show sign-in
let session = readSession();
const sessionSubs = new Set<() => void>();

export const getSession = () => session;
export function setSession(s: Session | null) {
  session = s;
  if (s) Storage.setItemSync('session', JSON.stringify(s));
  else Storage.removeItemSync('session');
  sessionSubs.forEach((f) => f());
}
export const subscribeSession = (f: () => void) => {
  sessionSubs.add(f);
  return () => void sessionSubs.delete(f);
};
/** Authorization header for CRM calls; empty when signed out. */
export const authHeaders = (): Record<string, string> => (session ? { Authorization: `Bearer ${session.token}` } : {});
