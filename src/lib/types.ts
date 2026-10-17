import type { CardColor } from '../theme/tokens';

export type CardFields = {
  businessName: string;
  contactPerson: string;
  designation: string;
  mobiles: string[];
  landlines: string[];
  emails: string[];
  addresses: string[];
  website: string;
  gstin: string;
  description: string;
  other: string;
};

export type Contact = CardFields & {
  id: string;
  notes: string;
  color: CardColor;
  frontUri: string;
  backUri: string | null;
  createdAt: string;
  updatedAt: string;
};

export const emptyFields: CardFields = {
  businessName: '',
  contactPerson: '',
  designation: '',
  mobiles: [],
  landlines: [],
  emails: [],
  addresses: [],
  website: '',
  gstin: '',
  description: '',
  other: '',
};
