import type { Contact } from './types';

/** First mobile, else first landline; `more` counts the remaining numbers. */
export function mainNumber(c: Pick<Contact, 'mobiles' | 'landlines'>) {
  const all = [...c.mobiles, ...c.landlines];
  return { main: all[0] ?? '', more: Math.max(0, all.length - 1) };
}

const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function relativeDate(iso: string, now: Date): string {
  const d = new Date(iso);
  const days = Math.round((midnight(now) - midnight(d)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 1 && days < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
