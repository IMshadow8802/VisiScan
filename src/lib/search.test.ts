import { filterContacts } from './search';
import { emptyFields, type Contact } from './types';

const now = new Date(2026, 9, 17, 15, 0);
const mk = (id: string, o: Partial<Contact>): Contact => ({
  ...emptyFields, id, notes: '', color: 'peach', frontUri: '', backUri: null,
  createdAt: new Date(2026, 9, 17, 9, 0).toISOString(), updatedAt: '', ...o,
});
const ids = (l: Contact[]) => l.map((c) => c.id);

const list = [
  mk('a', { businessName: 'Acme Traders', contactPerson: 'Ravi Kumar', emails: ['Ravi@Acme.com'], addresses: ['12 MG Road\nPune'], mobiles: ['+91 98765 43210'] }),
  mk('b', { businessName: 'Zed', landlines: ['020-2555 1234'], createdAt: new Date(2026, 9, 12, 10, 0).toISOString() }),
  mk('c', { businessName: 'Old', createdAt: new Date(2026, 9, 10, 23, 59).toISOString() }),
];

test('matches name, company, email, address text case-insensitively', () => {
  expect(ids(filterContacts(list, 'ACME', 'all', now))).toEqual(['a']);
  expect(ids(filterContacts(list, 'ravi kumar', 'all', now))).toEqual(['a']);
  expect(ids(filterContacts(list, 'ravi@acme', 'all', now))).toEqual(['a']);
  expect(ids(filterContacts(list, 'pune', 'all', now))).toEqual(['a']);
});

test('digit query ignores formatting', () => {
  expect(ids(filterContacts(list, '98765', 'all', now))).toEqual(['a']);
  expect(ids(filterContacts(list, '9876543210', 'all', now))).toEqual(['a']);
  expect(ids(filterContacts(list, '+91 98765', 'all', now))).toEqual(['a']);
  expect(ids(filterContacts(list, '020 2555', 'all', now))).toEqual(['b']);
});

test('today and week ranges use local calendar', () => {
  expect(ids(filterContacts(list, '', 'today', now))).toEqual(['a']);
  expect(ids(filterContacts(list, '', 'week', now))).toEqual(['a', 'b']);
  const midnight = new Date(2026, 9, 17, 0, 0, 1);
  expect(ids(filterContacts([mk('x', { createdAt: new Date(2026, 9, 16, 23, 59).toISOString() })], '', 'today', midnight))).toEqual([]);
});

test('empty query returns all within range', () => {
  expect(ids(filterContacts(list, '  ', 'all', now))).toEqual(['a', 'b', 'c']);
  expect(ids(filterContacts(list, '', 'week', now))).toEqual(['a', 'b']);
});

test('digit query also matches pincode in address', () => {
  const l = [mk('p', { addresses: ['Connaught Place, New Delhi 110001'] })];
  expect(ids(filterContacts(l, '110001', 'all', now))).toEqual(['p']);
});
