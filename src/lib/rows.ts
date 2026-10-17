import type { CardColor } from '../theme/tokens';
import type { Contact } from './types';

export type ContactRow = Omit<Contact, 'mobiles' | 'landlines' | 'emails' | 'addresses' | 'color'> & {
  mobiles: string;
  landlines: string;
  emails: string;
  addresses: string;
  color: string;
};

const parseList = (s: string): string[] => {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export const toRow = (c: Contact): ContactRow => ({
  ...c,
  mobiles: JSON.stringify(c.mobiles),
  landlines: JSON.stringify(c.landlines),
  emails: JSON.stringify(c.emails),
  addresses: JSON.stringify(c.addresses),
});

export const fromRow = (r: ContactRow): Contact => ({
  ...r,
  color: r.color as CardColor,
  mobiles: parseList(r.mobiles),
  landlines: parseList(r.landlines),
  emails: parseList(r.emails),
  addresses: parseList(r.addresses),
});
