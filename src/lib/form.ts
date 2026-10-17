import type { ExtractError } from './gemini';
import type { CardFields } from './types';

const LISTS = ['mobiles', 'landlines', 'emails', 'addresses'] as const;

export const canSave = (f: CardFields) =>
  !!(f.businessName.trim() || f.contactPerson.trim() || f.mobiles.some((m) => m.trim()));

export function cleanFields<T extends CardFields>(f: T): T {
  const out: any = { ...f };
  for (const [k, v] of Object.entries(f)) if (typeof v === 'string') out[k] = v.trim();
  for (const k of LISTS) out[k] = f[k].map((v) => v.trim()).filter(Boolean);
  return out;
}

export const setItem = (list: string[], i: number, v: string) => list.map((x, j) => (j === i ? v : x));
export const removeItem = (list: string[], i: number) => list.filter((_, j) => j !== i);

export function errorMessage(kind: ExtractError['kind']): string {
  if (kind === 'key') return 'API key invalid';
  if (kind === 'quota') return 'Daily limit reached, try later';
  if (kind === 'timeout' || kind === 'network') return 'No connection';
  return "Couldn't read the card";
}
