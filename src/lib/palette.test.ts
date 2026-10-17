import { nextColor } from './palette';
import { cardColors, type CardColor } from '../theme/tokens';
import { emptyFields, type Contact } from './types';

const mk = (color: CardColor, i: number): Contact => ({
  ...emptyFields, id: String(i), notes: '', color, frontUri: '', backUri: null,
  createdAt: new Date(2026, 0, 1 + i).toISOString(), updatedAt: '',
});

test('nextColor avoids the most recent card colour and cycles evenly', () => {
  expect(nextColor([])).toBe(cardColors[0]);
  expect(nextColor([mk('peach', 0)])).toBe('lilac');
  expect(nextColor([mk('lilac', 0), mk('peach', 1)])).toBe('mint');
  // unsorted input: newest is by createdAt, not array order
  expect(nextColor([mk('mint', 5), mk('peach', 0)])).toBe('lilac');
  // peach least-used but is newest -> next least-used, first in order
  const all = cardColors.map((c, i) => mk(c, i));
  expect(nextColor([...all, mk('lilac', 10)])).toBe('peach');
  expect(nextColor([...all, mk('peach', 10)])).toBe('lilac');
});
