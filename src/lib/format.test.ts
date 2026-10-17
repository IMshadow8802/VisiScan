import { mainNumber, relativeDate } from './format';

const now = new Date(2026, 9, 17, 15, 0); // Sat 17 Oct 2026, local

test('relativeDate', () => {
  expect(relativeDate(new Date(2026, 9, 17, 0, 5).toISOString(), now)).toBe('Today');
  expect(relativeDate(new Date(2026, 9, 16, 23, 59).toISOString(), now)).toBe('Yesterday');
  expect(relativeDate(new Date(2026, 9, 12, 9).toISOString(), now)).toBe('Mon');
  expect(relativeDate(new Date(2026, 9, 10, 9).toISOString(), now)).toBe('10 Oct');
});

test('mainNumber prefers mobile, counts the rest', () => {
  expect(mainNumber({ mobiles: ['m1', 'm2'], landlines: ['l1'] })).toEqual({ main: 'm1', more: 2 });
  expect(mainNumber({ mobiles: [], landlines: ['l1'] })).toEqual({ main: 'l1', more: 0 });
  expect(mainNumber({ mobiles: [], landlines: [] })).toEqual({ main: '', more: 0 });
});
