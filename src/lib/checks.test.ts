import { emailHint, gstinCheckChar, gstinHint, phoneHint } from './checks';

test('gstin check digit matches published GSTINs', () => {
  for (const g of ['27AAPFU0939F1ZV', '27AAACR5055K1Z7', '24AAACC1206D1ZM', '29AAGCB7383J1Z4']) expect(gstinCheckChar(g)).toBe(g[14]);
});

test('gstinHint: valid, lowercase and spaced are fine; bad shape and a misread char are flagged', () => {
  expect(gstinHint('27AAPFU0939F1ZV')).toBeNull();
  expect(gstinHint('27aapfu0939f1zv')).toBeNull();
  expect(gstinHint('27 AAPFU 0939F1ZV')).toBeNull();
  expect(gstinHint('')).toBeNull();
  expect(gstinHint('27AAPFU0939F1Z')).toMatch(/15 characters/);
  expect(gstinHint('27AAPFU0939F1ZY')).toMatch(/misread/);
  expect(gstinHint('27AAPFU0B39F1ZV')).toMatch(/misread/); // 8 read as B
});

test('gstinHint: special registrations only get the shape check', () => {
  // not PAN-shaped (UIN / TDS style): no check-digit warning even if it would fail
  expect(gstinHint('0717UNO00157UN5')).toBeNull();
  expect(gstinHint('07DELA12345B1D9')).toBeNull();
});

test('phoneHint accepts the ways Indian and foreign numbers are printed', () => {
  for (const m of ['+91 98765 43210', '+91-9876-543-210', '919876543210', '09876543210', '98765 43210', '0091 98765 43210'])
    expect(phoneHint(m, true)).toBeNull();
  for (const l of ['011-2345 6789', '(0161) 234567', '+91 161 2345678', '2345678', '2345678/79', '011 2345 6789 Ext. 234', '1800-123-4567', '+971 4 123 4567', '+1 (415) 555-0132'])
    expect(phoneHint(l, false)).toBeNull();
  expect(phoneHint('', true)).toBeNull();
});

test('phoneHint flags lengths and landlines in the mobile list', () => {
  expect(phoneHint('98765', true)).toMatch(/unusual length/);
  expect(phoneHint('+91 98765 4321', true)).toMatch(/10 digits after \+91/);
  expect(phoneHint('0161 2345678', true)).toMatch(/landline/);
  expect(phoneHint('0161 2345678', false)).toBeNull();
  expect(phoneHint('call us', false)).toMatch(/No digits/);
});

test('emailHint stays quiet on real-world addresses', () => {
  for (const e of ['raaj@prdinfotech.com', 'a.b+cards@company.co.in', 'sales@shop.store', 'info@例え.jp', 'x@ymail.com', 'x@mail.com', 'x@yahoo.co.in', 'Name@GMAIL.COM'])
    expect(emailHint(e)).toBeNull();
});

test('emailHint flags undeliverable and near-miss free-mail domains', () => {
  expect(emailHint('raaj prdinfotech.com')).toMatch(/complete email/);
  expect(emailHint('raaj@prdinfotech')).toMatch(/complete email/);
  expect(emailHint('ra aj@x.com')).toMatch(/complete email/);
  expect(emailHint('a@gmial.com')).toBe('Did you mean …@gmail.com? Check it against the card.');
  expect(emailHint('a@gmail.con')).toMatch(/gmail\.com/);
  expect(emailHint('a@rediffmial.com')).toMatch(/rediffmail\.com/);
});
