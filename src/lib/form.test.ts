import { canSave, cleanFields, errorMessage, formChanged, removeItem, setItem } from './form';
import { emptyFields } from './types';

test('canSave needs a business name, person or mobile', () => {
  expect(canSave(emptyFields)).toBe(false);
  expect(canSave({ ...emptyFields, businessName: '  ', mobiles: [' ', ''] })).toBe(false);
  expect(canSave({ ...emptyFields, emails: ['a@b.c'], website: 'x.com' })).toBe(false);
  expect(canSave({ ...emptyFields, businessName: 'Acme' })).toBe(true);
  expect(canSave({ ...emptyFields, contactPerson: 'Ravi' })).toBe(true);
  expect(canSave({ ...emptyFields, mobiles: ['', '98100 00000'] })).toBe(true);
});

test('cleanFields trims text and drops blank list rows', () => {
  expect(
    cleanFields({ ...emptyFields, businessName: ' Acme ', mobiles: [' 1 ', '', '  '], addresses: ['Line 1\nLine 2  '] }),
  ).toEqual({ ...emptyFields, businessName: 'Acme', mobiles: ['1'], addresses: ['Line 1\nLine 2'] });
});

test('list row helpers do not mutate', () => {
  const list = ['a', 'b', 'c'];
  expect(setItem(list, 1, 'x')).toEqual(['a', 'x', 'c']);
  expect(removeItem(list, 0)).toEqual(['b', 'c']);
  expect(list).toEqual(['a', 'b', 'c']);
});

test('errorMessage per kind', () => {
  expect(errorMessage('key')).toBe('API key missing or invalid. Check the keys in .env.local, then restart with expo start -c or rebuild');
  expect(errorMessage('quota')).toBe('Card reader limit reached. Try again in a minute');
  expect(errorMessage('busy')).toBe('Card reader is busy right now. Try again in a moment');
  expect(errorMessage('billing')).toBe('Card reader credits used up. Add credits to the account');
  expect(errorMessage('timeout')).toBe('Card reader took too long. Try again');
  expect(errorMessage('network')).toBe('No connection');
  expect(errorMessage('server')).toBe("Couldn't read the card");
  expect(errorMessage('parse')).toBe("Couldn't read the card");
});

test('formChanged compares fields and lists, ignoring key order and extra loaded keys', () => {
  const loaded = { ...emptyFields, notes: '', id: 'x', mobiles: ['1'] };
  expect(formChanged({ notes: '', ...emptyFields, mobiles: ['1'] }, loaded)).toBe(false);
  expect(formChanged({ ...emptyFields, notes: 'hi', mobiles: ['1'] }, loaded)).toBe(true);
  expect(formChanged({ ...emptyFields, notes: '', mobiles: ['1', ''] }, loaded)).toBe(true);
});
