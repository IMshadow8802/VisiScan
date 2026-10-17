import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';

export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
export type ViewMode = 'stack' | 'list';

export const getApiKey = () => SecureStore.getItemAsync('gemini_api_key');
export const setApiKey = (k: string) => SecureStore.setItemAsync('gemini_api_key', k);

export const getModel = async () => (await Storage.getItem('model')) ?? DEFAULT_MODEL;
export const setModel = (m: string) => Storage.setItem('model', m);

export const getViewMode = async (): Promise<ViewMode> =>
  (await Storage.getItem('viewMode')) === 'list' ? 'list' : 'stack';
export const setViewMode = (m: ViewMode) => Storage.setItem('viewMode', m);
