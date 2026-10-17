import axios from 'axios';
import { File } from 'expo-file-system';
import { clearPendingDelete, markSynced, pendingDeletes, unsyncedContacts } from './db';
import type { Contact } from './types';

export const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || 'https://shadowcodes.in/JRS/api/Card';

const TEXT = ['id', 'businessName', 'contactPerson', 'designation', 'website', 'gstin', 'description', 'other', 'notes', 'createdAt', 'updatedAt'] as const;
const LISTS = ['mobiles', 'landlines', 'emails', 'addresses'] as const;

type Part = string | { uri: string; name: string; type: 'image/jpeg' };

/** saveCard fields. Photo parts are described by uri; back is left out when the card has none. */
export function cardParts(c: Contact): [string, Part][] {
  const out: [string, Part][] = [
    ...TEXT.map((k): [string, Part] => [k, c[k] ?? '']),
    ...LISTS.map((k): [string, Part] => [k, JSON.stringify(c[k])]),
    ['front', { uri: c.frontUri, name: 'front.jpg', type: 'image/jpeg' }],
  ];
  if (c.backUri) out.push(['back', { uri: c.backUri, name: 'back.jpg', type: 'image/jpeg' }]);
  return out;
}

// RN-style { uri } parts: axios goes through XMLHttpRequest, which streams the file natively.
// (Expo's global fetch would reject them with "Unsupported FormDataPart".)
function cardForm(c: Contact): FormData {
  const f = new FormData();
  for (const [k, v] of cardParts(c)) {
    if (typeof v !== 'string' && !new File(v.uri).exists) throw new Error(`${k} photo is missing on this phone`);
    f.append(k, v as any);
  }
  return f;
}

/** null on success, otherwise a short reason for the sync alert. */
async function post(path: string, body: FormData | object): Promise<string | null> {
  const form = body instanceof FormData;
  try {
    const res = await axios.post(`${API_URL}/${path}`, body, {
      timeout: 60_000,
      headers: form ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' },
      // let RN's XHR build the multipart body and boundary itself
      transformRequest: form ? (d) => d : undefined,
      validateStatus: () => true,
    });
    if (res.status >= 200 && res.status < 300 && res.data?.success !== false) return null;
    return `Server ${res.status}${res.data?.message ? `: ${res.data.message}` : ''}`;
  } catch (e: any) {
    return e?.code === 'ECONNABORTED' ? 'Timed out' : String(e?.message ?? e);
  }
}

export type SyncState = { pending: number; busy: boolean; error: string | null };
let state: SyncState = { pending: 0, busy: false, error: null };
const subs = new Set<() => void>();
const emit = (s: Partial<SyncState>) => {
  state = { ...state, ...s };
  subs.forEach((f) => f());
};
// useSyncExternalStore pair, so the header button follows background syncs too
export const subscribeSync = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};
export const getSyncState = () => state;

const countPending = async () => (await pendingDeletes()).length + (await unsyncedContacts()).length;

let running: Promise<number> | null = null;

/**
 * Push pending deletes, then every card the server hasn't got. Safe to call any time:
 * concurrent calls share one run, and failures just stay pending for the next call.
 * Resolves to how many items are still waiting (0 = all synced).
 */
// ponytail: retries on every app open/save, no backoff; a card the server rejects (400/413/415) retries forever
export function syncNow(): Promise<number> {
  running ??= (async () => {
    emit({ busy: true, pending: await countPending() });
    let error: string | null = null;
    for (const id of await pendingDeletes()) {
      const e = await post('deleteCard', { id });
      if (!e) await clearPendingDelete(id);
      error ??= e;
    }
    for (const c of await unsyncedContacts()) {
      let e: string | null;
      try {
        e = await post('saveCard', cardForm(c));
      } catch (err) {
        e = String((err as Error).message);
      }
      if (!e) await markSynced(c);
      else if (__DEV__) console.warn('sync', c.id, e);
      error ??= e;
    }
    const pending = await countPending();
    return { pending, error: pending ? error : null };
  })()
    .catch((e) => ({ pending: state.pending || 1, error: String(e?.message ?? e) }))
    .then((r) => {
      emit({ busy: false, ...r });
      return r.pending;
    })
    .finally(() => (running = null));
  return running;
}
