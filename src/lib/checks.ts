// Soft checks for what the AI read off a card. They only produce a hint shown under the field:
// nothing is blocked or changed, because real cards carry every kind of number and address.
// Each rule errs towards silence: a wrong warning on a correct value is worse than none.

const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** 15th GSTIN character from the first 14 (base-36, factors 2/1 from the right). */
export function gstinCheckChar(g: string): string {
  let sum = 0;
  for (let i = 13, f = 2; i >= 0; i--, f = f === 2 ? 1 : 2) {
    const d = f * B36.indexOf(g[i]);
    sum += Math.floor(d / 36) + (d % 36);
  }
  return B36[(36 - (sum % 36)) % 36];
}

/**
 * Shape is the government e-invoice schema's rule (2 digits + 13 letters/digits).
 * The check digit isn't published officially, so it is only tested on regular GSTINs
 * (Z at position 14); UIN, TDS and other special numbers get the shape check alone.
 */
export function gstinHint(raw: string): string | null {
  const g = raw.toUpperCase().replace(/[\s-]/g, '');
  if (!g) return null;
  if (!/^[0-9]{2}[0-9A-Z]{13}$/.test(g)) return 'A GSTIN is 15 characters: 2 digits, then letters and digits. Check it against the card.';
  if (g[13] === 'Z' && gstinCheckChar(g) !== g[14])
    return "This GSTIN doesn't add up, a character may be misread. Check it against the card.";
  return null;
}

/** digits of the main number: drops "ext 23", "x23" and "/79"-style second numbers */
const mainDigits = (raw: string) =>
  raw
    .split(/\s*(?:ext\.?|extn\.?|extension|x)\s*\d+\s*$/i)[0]
    .split(/[/,;]/)[0]
    .replace(/[^\d+]/g, '');

/**
 * Indian numbers have a 10-digit national number (mobile or STD code + landline). Local landlines
 * printed without the STD code, toll-free (1800/1860…) and foreign numbers vary, so they are only
 * checked for a sane digit count.
 */
export function phoneHint(raw: string, mobile: boolean): string | null {
  const n = mainDigits(raw);
  if (!n) return raw.trim() ? 'No digits found. Check the number against the card.' : null;
  const intl = n.startsWith('+') || n.startsWith('00');
  const d = n.replace(/^\+|^00/, '').replace(/\D/g, '');
  if (d.length < 6 || d.length > 15) return 'This number has an unusual length. Check it against the card.';
  // national part of an Indian number, when we can tell it is one
  let national: string | null = null;
  if (intl) national = d.startsWith('91') ? d.slice(2) : null;
  else if (d.length === 12 && d.startsWith('91')) national = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) national = d.slice(1);
  else if (d.length === 10) national = d;
  if (intl && national !== null && national.length !== 10)
    return 'Indian numbers have 10 digits after +91. Check it against the card.';
  if (mobile && national?.length === 10 && !/^[6-9]/.test(national))
    return "This doesn't look like an Indian mobile (they start with 6–9). It may be a landline.";
  return null;
}

// big free-mail providers; a domain one letter away from these is almost always a misread
const MAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.in', 'ymail.com', 'rediffmail.com', 'hotmail.com',
  'outlook.com', 'outlook.in', 'live.com', 'icloud.com', 'protonmail.com', 'zohomail.in', 'zoho.com', 'aol.com', 'mail.com',
];

/** one insertion, deletion or substitution apart (transposed letters count too) */
function oneEditApart(a: string, b: string): boolean {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/**
 * Loose on purpose: company domains, long TLDs, Unicode names and plus-addressing are all fine.
 * Flags only what can't be delivered (no @, spaces, no dot in the domain) and near-misses of
 * the big free-mail domains (gmial.com, gmail.con).
 */
export function emailHint(raw: string): string | null {
  const e = raw.trim();
  if (!e) return null;
  const at = e.lastIndexOf('@');
  const domain = e.slice(at + 1).toLowerCase();
  if (at < 1 || /\s/.test(e) || !/^[^.]+(\.[^.]+)+$/.test(domain)) return "This doesn't look like a complete email address. Check it against the card.";
  const near = MAIL_DOMAINS.includes(domain) ? undefined : MAIL_DOMAINS.find((d) => d.length >= 8 && oneEditApart(domain, d));
  return near ? `Did you mean …@${near}? Check it against the card.` : null;
}
