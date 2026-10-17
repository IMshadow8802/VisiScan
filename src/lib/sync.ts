import { clearPendingDelete, markSynced, pendingDeletes, unsyncedContacts } from './db';
import type { Contact } from './types';

export const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || 'https://shadowcodes.in/JRS/api/Card';

const TEXT = ['id', 'businessName', 'contactPerson', 'designation', 'website', 'gstin', 'description', 'other', 'notes', 'createdAt', 'updatedAt'] as const;
const LISTS = ['mobiles', 'landlines', 'emails', 'addresses'] as const;

type Part = string | { uri: string; name: string; type: 'image/jpeg' };

/** saveCard fields. Photos are RN file parts; back is left out when the card has none. */
export function cardParts(c: Contact): [string, Part][] {
  const out: [string, Part][] = [
    ...TEXT.map((k): [string, Part] => [k, c[k] ?? '']),
    ...LISTS.map((k): [string, Part] => [k, JSON.stringify(c[k])]),
    ['front', { uri: c.frontUri, name: 'front.jpg', type: 'image/jpeg' }],
  ];
  if (c.backUri) out.push(['back', { uri: c.backUri, name: 'back.jpg', type: 'image/jpeg' }]);
  return out;
}

function cardForm(c: Contact): FormData {
  const f = new FormData();
  for (const [k, v] of cardParts(c)) f.append(k, v as any);
  return f;
}

async function post(path: string, body: FormData | object): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const json = !(body instanceof FormData);
    const res = await fetch(`${API_URL}/${path}`, {
      method: 'POST',
      headers: json ? { 'Content-Type': 'application/json' } : undefined,
      body: json ? JSON.stringify(body) : body,
      signal: ctrl.signal,
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return data?.success !== false;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export type SyncState = { pending: number; busy: boolean };
let state: SyncState = { pending: 0, busy: false };
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
    for (const id of await pendingDeletes()) if (await post('deleteCard', { id })) await clearPendingDelete(id);
    for (const c of await unsyncedContacts()) {
      if (await post('saveCard', cardForm(c))) await markSynced(c);
    }
    return countPending();
  })()
    .catch(() => state.pending || 1)
    .then((pending) => {
      emit({ busy: false, pending });
      return pending;
    })
    .finally(() => (running = null));
  return running;
}
