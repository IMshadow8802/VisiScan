import axios from 'axios';
import { buildRequest, parseExtraction, extractCard, ExtractError } from './gemini';
import { emptyFields } from './types';

const wrap = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });
const sample = { ...emptyFields, businessName: 'Acme', contactPerson: 'A B', mobiles: ['98'], emails: ['a@b.c'], addresses: ['1 St\nCity'] };

jest.mock('axios');
const post = axios.post as jest.Mock;
afterEach(() => post.mockReset());

const mockFetch = (status: number, body = '') => post.mockResolvedValue({ status, data: body });
const kindOf = async () => extractCard([{ base64: 'x' }], 'k', 'm', 30000, []).catch((e) => e.kind);

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
  mockFetch(402);
  expect(await kindOf()).toBe('billing');
  mockFetch(404);
  expect(await kindOf()).toBe('model');
  mockFetch(500);
  expect(await kindOf()).toBe('busy');
});

test('extractCard keeps Gemini own error message', async () => {
  mockFetch(503, '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}');
  const e = await extractCard([{ base64: 'x' }], 'k', 'm', 30000, []).catch((x) => x);
  expect(e.kind).toBe('busy');
  expect(e.detail).toBe('Gemini 503 UNAVAILABLE: This model is currently experiencing high demand.');
  mockFetch(502, '<html>bad gateway</html>');
  expect((await extractCard([{ base64: 'x' }], 'k', 'm', 30000, []).catch((x) => x)).detail).toBe('Gemini 502');
});

test('parseExtraction says why a 200 has no text', () => {
  expect(() => parseExtraction({ promptFeedback: { blockReason: 'SAFETY' } })).toThrow(expect.objectContaining({ kind: 'blocked', detail: 'Gemini stopped: SAFETY' }));
  expect(() => parseExtraction({ candidates: [{ finishReason: 'STOP', content: { parts: [] } }] })).toThrow(expect.objectContaining({ kind: 'parse' }));
});

test('extractCard retries when Gemini is busy', async () => {
  post.mockResolvedValueOnce({ status: 503, data: '' }).mockResolvedValueOnce({ status: 200, data: JSON.stringify(wrap(JSON.stringify(sample))) });
  expect(await extractCard([{ base64: 'x' }], 'k', 'm', 30000, [0])).toEqual(sample);
  expect(post).toHaveBeenCalledTimes(2);
  post.mockResolvedValue({ status: 503, data: '' });
  await expect(extractCard([{ base64: 'x' }], 'k', 'm', 30000, [0, 0])).rejects.toMatchObject({ kind: 'busy' });
  expect(post).toHaveBeenCalledTimes(5);
});

test('extractCard returns fields on success', async () => {
  mockFetch(200, JSON.stringify(wrap(JSON.stringify(sample))));
  expect(await extractCard([{ base64: 'x' }], 'k', 'm')).toEqual(sample);
});

test('extractCard times out', async () => {
  post.mockImplementation((_u: any, _d: any, cfg: any) => new Promise((_r, rej) => cfg.signal.addEventListener('abort', () => rej(new Error('abort')))));
  await expect(extractCard([], 'k', 'm', 50)).rejects.toMatchObject({ kind: 'timeout' });
});

test('extractCard maps request failure to network', async () => {
  post.mockRejectedValue(new Error('Network Error'));
  expect(await kindOf()).toBe('network');
});
