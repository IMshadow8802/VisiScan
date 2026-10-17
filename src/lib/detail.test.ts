import { detailSections, faceSequence } from './detail';
import { emptyFields, type Contact } from './types';

const base: Contact = {
  ...emptyFields,
  id: '1',
  notes: '',
  color: 'mint',
  frontUri: 'f.jpg',
  backUri: null,
  createdAt: '2026-10-17T00:00:00Z',
  updatedAt: '2026-10-17T00:00:00Z',
};

test('detailSections is empty for an empty card', () => {
  expect(detailSections(base)).toEqual([]);
});

test('detailSections keeps only non-empty sections and rows, in order', () => {
  const s = detailSections({
    ...base,
    contactPerson: 'Ravi',
    mobiles: ['98100 00000', '98100 11111'],
    landlines: ['011 2345 6789'],
    emails: ['a@b.c'],
    gstin: '07AAAAA0000A1Z5',
    notes: 'Met at expo',
  });
  expect(s.map((x) => x.title)).toEqual(['Contact', 'Phones', 'Email', 'Business', 'Notes']);
  expect(s[0].rows).toEqual([{ label: 'Person', value: 'Ravi' }]);
  expect(s[1].rows).toEqual([
    { label: 'Mobile', value: '98100 00000' },
    { label: 'Mobile', value: '98100 11111' },
    { label: 'Landline', value: '011 2345 6789' },
  ]);
  expect(s[3].rows).toEqual([{ label: 'GSTIN', value: '07AAAAA0000A1Z5' }]);
});

test('detailSections ignores whitespace-only values', () => {
  expect(detailSections({ ...base, website: '  ', addresses: [' '] })).toEqual([]);
});

test('faceSequence skips the back photo when absent', () => {
  expect(faceSequence(base)).toEqual(['card', 'f.jpg']);
  expect(faceSequence({ ...base, backUri: 'b.jpg' })).toEqual(['card', 'f.jpg', 'b.jpg']);
});
