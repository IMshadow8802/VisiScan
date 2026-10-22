import axios from 'axios';
import { ExtractError, fieldsFromText, PROMPT, SCHEMA } from './gemini';
import type { CardFields } from './types';

export const CLAUDE_MODEL = 'claude-haiku-5-5';

export function buildClaudeRequest(images: { base64: string }[]) {
  return {
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        ...images.map((i) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: i.base64 } })),
        { type: 'text', text: PROMPT },
      ],
    }],
    // structured outputs: the reply text is JSON matching the schema (objects must set additionalProperties false)
    output_config: { format: { type: 'json_schema', schema: { ...SCHEMA, additionalProperties: false } } },
  };
}

// HTTP status → kind, per platform.claude.com/docs/en/api/errors
export function claudeKind(status: number): ExtractError['kind'] {
  if (status === 401 || status === 403) return 'key';
  if (status === 402) return 'billing';
  if (status === 404) return 'model';
  if (status === 429) return 'quota';
  if (status >= 500) return 'busy'; // 500 api_error, 504 timeout_error, 529 overloaded_error
  return 'server';
}

/** "Claude 529 overloaded_error: The API is temporarily overloaded." */
export function claudeDetail(status: number, body: unknown): string {
  const e = (body as any)?.error;
  const head = ['Claude', status, typeof e?.type === 'string' ? e.type : ''].filter(Boolean).join(' ');
  return typeof e?.message === 'string' && e.message ? `${head}: ${e.message}` : head;
}

export function parseClaude(json: unknown): CardFields {
  const j = json as any;
  if (j?.stop_reason === 'refusal') throw new ExtractError('blocked', 'Refused', 'Claude stopped: refusal');
  const text = Array.isArray(j?.content)
    ? j.content.map((b: any) => (b?.type === 'text' && typeof b.text === 'string' ? b.text : '')).join('').trim()
    : '';
  if (!text) throw new ExtractError('parse', 'Empty response', `Claude returned an empty answer (${j?.stop_reason ?? 'no stop reason'})`);
  return fieldsFromText(text);
}

export async function extractWithClaude(images: { base64: string }[], apiKey: string, timeoutMs = 30000): Promise<CardFields> {
  let res: { status: number; data: any };
  try {
    res = await axios.post('https://api.anthropic.com/v1/messages', buildClaudeRequest(images), {
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      timeout: timeoutMs,
      validateStatus: () => true,
    });
  } catch (e: any) {
    throw e?.code === 'ECONNABORTED'
      ? new ExtractError('timeout', undefined, `Claude took longer than ${timeoutMs / 1000}s`)
      : new ExtractError('network', undefined, 'Could not reach Claude');
  }
  if (res.status >= 400) throw new ExtractError(claudeKind(res.status), `HTTP ${res.status}`, claudeDetail(res.status, res.data));
  return parseClaude(res.data);
}
