import { cardColors, type CardColor } from '../theme/tokens';
import type { Contact } from './types';

/** Least-used colour, never the newest card's; ties go to the first in cardColors. */
export function nextColor(existing: Contact[]): CardColor {
  if (!existing.length) return cardColors[0];
  const newest = existing.reduce((a, b) => (b.createdAt > a.createdAt ? b : a)).color;
  const used = (col: CardColor) => existing.filter((c) => c.color === col).length;
  return cardColors
    .filter((col) => col !== newest)
    .reduce((best, col) => (used(col) < used(best) ? col : best));
}
