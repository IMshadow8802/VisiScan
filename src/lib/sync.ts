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

let running: Promise<void> | null = null;

/**
 * Push pending deletes, then every card the server hasn't got. Safe to call any time:
 * concurrent calls share one run, and failures just stay pending for the next call.
 */
// ponytail: retries on every app open/save, no backoff; a card the server rejects (400/413/415) retries forever
export function syncNow(): Promise<void> {
  running ??= (async () => {
    for (const id of await pendingDeletes()) if (await post('deleteCard', { id })) await clearPendingDelete(id);
    for (const c of await unsyncedContacts()) if (await post('saveCard', cardForm(c))) await markSynced(c);
  })()
    .catch(() => {})
    .finally(() => (running = null));
  return running;
}
