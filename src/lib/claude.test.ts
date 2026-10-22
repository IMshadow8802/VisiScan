import axios from 'axios';
import { buildClaudeRequest, extractWithClaude } from './claude';
import { readCard } from './read';
import { emptyFields } from './types';

jest.mock('axios');
jest.mock('./settings', () => ({
  getClaudeKey: jest.fn(async () => 'c'),
  getApiKey: jest.fn(async () => 'g'),
  getModel: jest.fn(async () => 'm'),
}));
const post = axios.post as jest.Mock;
afterEach(() => post.mockReset());

const claudeOk = { status: 200, data: { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"businessName":"Acme"}' }] } };
const geminiOk = { status: 200, data: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"businessName":"Gem"}' }] } }] }) };
const busy529 = { status: 529, data: { type: 'error', error: { type: 'overloaded_error', message: 'The API is temporarily overloaded.' } } };

test('buildClaudeRequest sends images then prompt, strict schema', () => {
  const r = buildClaudeRequest([{ base64: 'a' }, { base64: 'b' }]);
  expect(r.messages[0].content.map((c: any) => c.type)).toEqual(['image', 'image', 'text']);
  expect(r.output_config.format.schema.additionalProperties).toBe(false);
});

test('extractWithClaude maps errors and refusals', async () => {
  post.mockResolvedValue(busy529);
  await expect(extractWithClaude([], 'k')).rejects.toMatchObject({ kind: 'busy', detail: 'Claude 529 overloaded_error: The API is temporarily overloaded.' });
  post.mockResolvedValue({ status: 402, data: {} });
  await expect(extractWithClaude([], 'k')).rejects.toMatchObject({ kind: 'billing', detail: 'Claude 402' });
  post.mockResolvedValue({ status: 200, data: { stop_reason: 'refusal', content: [] } });
  await expect(extractWithClaude([], 'k')).rejects.toMatchObject({ kind: 'blocked' });
});

test('readCard uses Claude first', async () => {
  post.mockResolvedValueOnce(claudeOk);
  expect(await readCard([{ base64: 'x' }])).toEqual({ ...emptyFields, businessName: 'Acme' });
  expect(post).toHaveBeenCalledTimes(1);
});

test('readCard falls back to Gemini when Claude fails', async () => {
  post.mockResolvedValueOnce(busy529).mockResolvedValueOnce(geminiOk);
  expect(await readCard([{ base64: 'x' }])).toEqual({ ...emptyFields, businessName: 'Gem' });
  expect(post.mock.calls[1][0]).toContain('generativelanguage.googleapis.com');
});

test('readCard shows both reasons when both fail', async () => {
  post.mockResolvedValueOnce(busy529).mockResolvedValue({ status: 404, data: '{"error":{"code":404,"message":"no model","status":"NOT_FOUND"}}' });
  await expect(readCard([{ base64: 'x' }])).rejects.toMatchObject({
    kind: 'model',
    detail: 'Claude 529 overloaded_error: The API is temporarily overloaded.\nGemini 404 NOT_FOUND: no model',
  });
});
