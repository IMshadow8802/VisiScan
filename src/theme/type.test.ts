import { scaleFont } from './type';

test('scaleFont is identity at 390pt width', () => expect(scaleFont(16, 390)).toBe(16));
test('scaleFont shrinks on small phones but not below 85%', () => expect(scaleFont(20, 320)).toBe(17));
test('scaleFont grows on tablets but caps at 130%', () => expect(scaleFont(20, 1024)).toBe(26));
test('scaleFont rounds to whole pixels', () => expect(Number.isInteger(scaleFont(15, 412))).toBe(true));
