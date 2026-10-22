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
