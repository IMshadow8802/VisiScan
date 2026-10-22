import axios from 'axios';
import * as db from './db';
import { getSession, setSession } from './settings';
import { cardParts, paintCards, photoSource, syncNow } from './sync';
import { emptyFields, type Contact } from './types';

jest.mock('axios');
jest.mock('expo-sqlite/kv-store', () => {
  const m = new Map<string, string>();
  return {
    getItemSync: (k: string) => m.get(k) ?? null,
    setItemSync: (k: string, v: string) => void m.set(k, v),
    removeItemSync: (k: string) => m.delete(k),
    getItem: async (k: string) => m.get(k) ?? null,
    setItem: async (k: string, v: string) => void m.set(k, v),
  };
});
jest.mock('./db', () => ({
  pendingDeletes: jest.fn(async () => []),
  unsyncedContacts: jest.fn(async () => []),
  clearPendingDelete: jest.fn(async () => {}),
  markSynced: jest.fn(async () => {}),
}));
const post = axios.post as jest.Mock;
const deletes = db.pendingDeletes as jest.Mock;
const SESSION = { apiBase: 'https://crm.example.com', token: 't0k', userName: 'Ravi' };
beforeEach(() => setSession(SESSION));
afterEach(() => {
  post.mockReset();
  deletes.mockReset().mockResolvedValue([]);
  (db.clearPendingDelete as jest.Mock).mockClear();
});

const card: Contact = {
  ...emptyFields,
  businessName: 'Shree Ganesh',
  mobiles: ['+91 9876543210'],
  id: 'abc',
  notes: '',
  color: 'peach',
  frontUri: 'file:///docs/cards/abc-front.jpg',
  backUri: null,
  createdAt: '2026-10-17T10:00:00.000Z',
  updatedAt: '2026-10-17T10:00:00.000Z',
};

const parts = (c: Contact) => Object.fromEntries(cardParts(c).map(([k, v]) => [k, typeof v === 'string' ? v : v.uri]));

test('cardParts sends every text field, lists as JSON, and no back when blank', () => {
  const p = parts(card);
  expect(p.businessName).toBe('Shree Ganesh');
  expect(p.website).toBe('');
  expect(p.mobiles).toBe('["+91 9876543210"]');
  expect(p.landlines).toBe('[]');
  expect(p.front).toBe(card.frontUri);
  expect('back' in p).toBe(false);
  expect('color' in p).toBe(false);
});

test('cardParts includes back when present', () => {
  expect(parts({ ...card, backUri: 'file:///b.jpg' }).back).toBe('file:///b.jpg');
});

test('paintCards never repeats a colour within six neighbours, and a new card keeps older colours', () => {
  const list = Array.from({ length: 9 }, (_, i) => ({ ...card, id: `c${i}` }));
  const colors = paintCards(list).map((c) => c.color);
  for (let i = 0; i + 6 <= colors.length; i++) expect(new Set(colors.slice(i, i + 6)).size).toBe(6);
  const withNew = paintCards([{ ...card, id: 'new' }, ...list]).map((c) => c.color);
  expect(withNew.slice(1)).toEqual(colors);
});

test('syncNow does nothing while signed out', async () => {
  setSession(null);
  deletes.mockResolvedValue(['gone']);
  expect(await syncNow()).toBe(1);
  expect(post).not.toHaveBeenCalled();
});

test('syncNow calls the signed-in CRM with the bearer token', async () => {
  deletes.mockResolvedValueOnce(['gone']).mockResolvedValueOnce(['gone']).mockResolvedValue([]);
  post.mockResolvedValue({ status: 200, data: { success: true } });
  expect(await syncNow()).toBe(0);
  expect(post).toHaveBeenCalledWith('https://crm.example.com/api/Card/deleteCard', { id: 'gone' }, expect.objectContaining({
    headers: expect.objectContaining({ Authorization: 'Bearer t0k' }),
  }));
  expect(db.clearPendingDelete).toHaveBeenCalledWith('gone');
});

test('a 401 signs out, stops the run and keeps the queue', async () => {
  deletes.mockResolvedValue(['a', 'b']);
  post.mockResolvedValue({ status: 401, data: { message: 'expired' } });
  expect(await syncNow()).toBe(2);
  expect(post).toHaveBeenCalledTimes(1);
  expect(db.clearPendingDelete).not.toHaveBeenCalled();
  expect(getSession()).toBeNull();
});

test('photoSource adds the token to server photos only', () => {
  expect(photoSource('https://crm.example.com/uploads/a.jpg')).toEqual({ uri: 'https://crm.example.com/uploads/a.jpg', headers: { Authorization: 'Bearer t0k' } });
  expect(photoSource('file:///docs/a.jpg')).toBe('file:///docs/a.jpg');
});
