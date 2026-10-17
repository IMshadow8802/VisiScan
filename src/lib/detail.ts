import type { Contact } from './types';

export type Row = { label: string; value: string };
export type Section = { title: string; rows: Row[] };

const one = (label: string, value: string): Row[] => [{ label, value }];
const many = (label: string, values: string[]): Row[] => values.map((value) => ({ label, value }));

/** Detail screen sections; blank rows and empty sections are dropped. Empty label = the section title says it. */
export function detailSections(c: Contact): Section[] {
  const all: Section[] = [
    { title: 'Contact', rows: [...one('Person', c.contactPerson), ...one('Designation', c.designation)] },
    { title: 'Phones', rows: [...many('Mobile', c.mobiles), ...many('Landline', c.landlines)] },
    { title: 'Email', rows: many('', c.emails) },
    { title: 'Addresses', rows: many('', c.addresses) },
    {
      title: 'Business',
      rows: [...one('Website', c.website), ...one('GSTIN', c.gstin), ...one('What they do', c.description)],
    },
    { title: 'Other', rows: one('', c.other) },
    { title: 'Notes', rows: one('', c.notes) },
  ];
  return all
    .map((s) => ({ ...s, rows: s.rows.filter((r) => r.value.trim()) }))
    .filter((s) => s.rows.length);
}

/** Tap cycle on the detail hero: the card, then each photo. */
export const faceSequence = (c: Pick<Contact, 'frontUri' | 'backUri'>) => ['card', c.frontUri, ...(c.backUri ? [c.backUri] : [])];
