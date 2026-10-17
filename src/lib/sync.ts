import axios from 'axios';
import { File, Paths } from 'expo-file-system';
import { cardColors } from '../theme/tokens';
import { clearPendingDelete, getContact, listContacts, markSynced, pendingDeletes, unsyncedContacts } from './db';
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
async function cardForm(c: Contact): Promise<FormData> {
  const f = new FormData();
  for (const [k, v] of cardParts(c)) {
    if (typeof v === 'string') {
      f.append(k, v);
      continue;
    }
    // a card from the server keeps its photos there; fetch them so the edit can re-send them
    const uri = await localPhoto(v.uri);
    if (!new File(uri).exists) throw new Error(`${k} photo is missing on this phone`);
    f.append(k, { ...v, uri } as any);
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

// ---- reading from the server: the list shows what fetchCard returns ----

// Photos stay on the server. downloadCardPhoto is a POST, which image views can't send, so a
// card's photo uri is this marker; localPhoto() fetches it into the cache when it's shown.
// updatedAt is in the marker so an edited card never shows a stale cached photo.
const REMOTE = 'visiscan-remote://';
const remoteUri = (id: string, side: 'front' | 'back', v: string) => `${REMOTE}${id}/${side}/${encodeURIComponent(v)}`;

/** File uri for any card photo; server photos are downloaded once into the cache. */
export async function localPhoto(uri: string): Promise<string> {
  if (!uri.startsWith(REMOTE)) return uri;
  const [id, side, v] = uri.slice(REMOTE.length).split('/');
  const file = new File(Paths.cache, `card-${id}-${side}-${v.replace(/[^0-9a-z]/gi, '')}.jpg`);
  if (!file.exists) {
    const res = await axios.post(`${API_URL}/downloadCardPhoto`, { id, side }, { responseType: 'arraybuffer', timeout: 60_000 });
    file.write(new Uint8Array(res.data));
  }
  return file.uri;
}

// stable per card, so a card keeps its colour on every device
const colorFor = (id: string) => cardColors[[...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % cardColors.length];

type ServerCard = Omit<Contact, 'color' | 'frontUri' | 'backUri'> & { hasBack: boolean };

const fromServer = (r: ServerCard): Contact => ({
  id: r.id,
  businessName: r.businessName ?? '', contactPerson: r.contactPerson ?? '', designation: r.designation ?? '',
  mobiles: r.mobiles ?? [], landlines: r.landlines ?? [], emails: r.emails ?? [], addresses: r.addresses ?? [],
  website: r.website ?? '', gstin: r.gstin ?? '', description: r.description ?? '', other: r.other ?? '', notes: r.notes ?? '',
  color: colorFor(r.id),
  frontUri: remoteUri(r.id, 'front', r.updatedAt),
  backUri: r.hasBack ? remoteUri(r.id, 'back', r.updatedAt) : null,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

const PAGE = 100;

async function fetchCards(): Promise<Contact[]> {
  const out: Contact[] = [];
  for (let page = 1; ; page++) {
    const res = await axios.post(`${API_URL}/fetchCard`, { search: '', pageNumber: page, pageSize: PAGE }, { timeout: 30_000 });
    const d = res.data?.data;
    if (!res.data?.success || !Array.isArray(d?.rows)) throw new Error(res.data?.message || 'Bad reply from server');
    out.push(...d.rows.map(fromServer));
    if (page >= (d.totalPages ?? 1) || d.rows.length < PAGE) return out;
  }
}

/**
 * The cards to show: the server's list, plus scans and edits on this phone that haven't
 * uploaded yet, minus deletes still queued. Offline, falls back to what this phone has.
 */
export async function loadCards(): Promise<{ cards: Contact[]; error: string | null }> {
  const [local, waiting, deleting] = await Promise.all([listContacts(), unsyncedContacts(), pendingDeletes()]);
  const gone = new Set(deleting);
  let cards: Contact[];
  let error: string | null = null;
  try {
    const byId = new Map((await fetchCards()).map((c) => [c.id, c]));
    for (const c of waiting) byId.set(c.id, c);
    cards = [...byId.values()];
  } catch (e: any) {
    error = `Showing cards saved on this phone. ${e?.message ?? e}`;
    cards = local;
  }
  cards = cards.filter((c) => !gone.has(c.id)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return { cards, error };
}

/** One card: an unsent local version wins, otherwise the server's, otherwise this phone's copy. */
export async function getCard(id: string): Promise<Contact | null> {
  const waiting = (await unsyncedContacts()).find((c) => c.id === id);
  if (waiting) return waiting;
  try {
    const res = await axios.post(`${API_URL}/fetchCard`, { id }, { timeout: 30_000 });
    const row = res.data?.data?.rows?.[0];
    if (row) return fromServer(row);
  } catch {
    // offline: fall through to the local copy
  }
  return getContact(id);
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
        e = await post('saveCard', await cardForm(c));
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
