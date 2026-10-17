import { cardParts, paintCards } from './sync';
import { emptyFields, type Contact } from './types';

jest.mock('./db', () => ({}));

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
