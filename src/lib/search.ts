import type { Contact } from './types';

export type Range = 'all' | 'today' | 'week';

const digits = (s: string) => s.replace(/\D/g, '');
const numbers = (c: Contact) => [...c.mobiles, ...c.landlines];
const texts = (c: Contact) => [
  c.businessName, c.contactPerson, c.designation, c.website, c.gstin, c.description, c.other, c.notes,
  ...c.emails, ...c.addresses, ...numbers(c),
];

export function filterContacts(list: Contact[], query: string, range: Range, now: Date): Contact[] {
  const q = query.trim().toLowerCase();
  const digitQuery = digits(q).length >= 3 && /^[\d\s+\-()]+$/.test(q);
  const qd = digits(q);
  // local midnight; week = today and the 6 days before
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (range === 'week' ? 6 : 0)).getTime();

  return list.filter((c) => {
    if (range !== 'all' && new Date(c.createdAt).getTime() < start) return false;
    if (!q) return true;
    if (digitQuery && numbers(c).some((n) => digits(n).includes(qd))) return true;
    return texts(c).some((t) => t.toLowerCase().includes(q));
  });
}
