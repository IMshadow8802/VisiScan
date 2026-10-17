import { fromRow, toRow } from './rows';
import { emptyFields, type Contact } from './types';

const contact: Contact = {
  ...emptyFields,
  id: 'a1',
  businessName: 'Acme',
  mobiles: ['+91 1', '+91 2', '+91 3'],
  addresses: ['Line 1', 'Line 2'],
  notes: 'n',
  color: 'mint',
  frontUri: 'file:///f.jpg',
  backUri: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

test('round-trips a contact', () => {
  expect(fromRow(toRow(contact))).toEqual(contact);
});

test('bad JSON list becomes []', () => {
  expect(fromRow({ ...toRow(contact), mobiles: 'not json' }).mobiles).toEqual([]);
});
