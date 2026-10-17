import { buildRequest, parseExtraction, extractCard, ExtractError } from './gemini';
import { emptyFields } from './types';

const wrap = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });
const sample = { ...emptyFields, businessName: 'Acme', contactPerson: 'A B', mobiles: ['98'], emails: ['a@b.c'], addresses: ['1 St\nCity'] };

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const mockFetch = (status: number, body = '') =>
  (globalThis.fetch = jest.fn().mockResolvedValue({ ok: status < 400, status, text: async () => body, json: async () => JSON.parse(body) }) as any);
const kindOf = async () => extractCard([{ base64: 'x' }], 'k', 'm').catch((e) => e.kind);

test('buildRequest sends every image and json schema', () => {
  const r: any = buildRequest([{ base64: 'a' }, { base64: 'b' }]);
  expect(r.contents[0].parts).toHaveLength(3);
  expect(r.contents[0].parts[1].inline_data).toEqual({ mime_type: 'image/jpeg', data: 'a' });
  expect(r.generationConfig.responseMimeType).toBe('application/json');
  expect(r.generationConfig.responseJsonSchema.required).toHaveLength(11);
});

test('parseExtraction reads candidate text JSON', () => {
  expect(parseExtraction(wrap(JSON.stringify(sample)))).toEqual(sample);
});

test('parseExtraction tolerates junk', () => {
  expect(parseExtraction(wrap('{}'))).toEqual(emptyFields);
  expect(parseExtraction(wrap('{"mobiles":"98 ", "website":" w "}'))).toEqual({ ...emptyFields, mobiles: ['98'], website: 'w' });
  expect(parseExtraction(wrap('```json\n' + JSON.stringify(sample) + '\n```'))).toEqual(sample);
  expect(parseExtraction(wrap('not json'))).toEqual({ ...emptyFields, other: 'not json' });
  expect(() => parseExtraction({})).toThrow(ExtractError);
});

test('parseExtraction drops blank and duplicate list items', () => {
  expect(parseExtraction(wrap('{"emails":["  ","a","a"]}')).emails).toEqual(['a']);
});

test('extractCard maps http errors', async () => {
  mockFetch(400, '{"error":{"details":[{"reason":"API_KEY_INVALID"}]}}');
  expect(await kindOf()).toBe('key');
  mockFetch(400, '{"error":{"message":"bad request"}}');
  expect(await kindOf()).toBe('server');
  mockFetch(401);
  expect(await kindOf()).toBe('key');
  mockFetch(403);
  expect(await kindOf()).toBe('key');
  mockFetch(429);
  expect(await kindOf()).toBe('quota');
  mockFetch(500);
  expect(await kindOf()).toBe('server');
});

test('extractCard returns fields on success', async () => {
  mockFetch(200, JSON.stringify(wrap(JSON.stringify(sample))));
  expect(await extractCard([{ base64: 'x' }], 'k', 'm')).toEqual(sample);
});

test('extractCard times out', async () => {
  globalThis.fetch = jest.fn((_u: any, init: any) => new Promise((_r, rej) => init.signal.addEventListener('abort', () => rej(new Error('abort'))))) as any;
  await expect(extractCard([], 'k', 'm', 50)).rejects.toMatchObject({ kind: 'timeout' });
});

test('extractCard maps fetch rejection to network', async () => {
  globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('offline')) as any;
  expect(await kindOf()).toBe('network');
});
