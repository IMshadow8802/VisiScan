import axios from 'axios';
import { emptyFields, type CardFields } from './types';

type Kind = 'key' | 'quota' | 'busy' | 'billing' | 'model' | 'blocked' | 'network' | 'timeout' | 'server' | 'parse';

export class ExtractError extends Error {
  /** `detail` is Gemini's own wording (HTTP code + message), shown under the friendly heading */
  constructor(public kind: Kind, message?: string, public detail = '') {
    super(message ?? kind);
    this.name = 'ExtractError';
  }
}

// HTTP status → kind, per ai.google.dev/gemini-api/docs/api-errors
export function kindForStatus(status: number, body: string): Kind {
  if (status === 401 || status === 403 || (status === 400 && /API_KEY_INVALID|api key/i.test(body))) return 'key';
  if (status === 402 || (status === 400 && /FAILED_PRECONDITION|billing/i.test(body))) return 'billing';
  if (status === 404) return 'model';
  if (status === 429) return 'quota';
  if (status >= 500) return 'busy';
  return 'server';
}

/** "Gemini 503 UNAVAILABLE: This model is currently experiencing high demand..." */
export function errorDetail(status: number, body: string): string {
  let e: any;
  try {
    e = JSON.parse(body)?.error;
  } catch {}
  const head = ['Gemini', status, typeof e?.status === 'string' ? e.status : ''].filter(Boolean).join(' ');
  return typeof e?.message === 'string' && e.message ? `${head}: ${e.message}` : head;
}

export const PROMPT = `These images are the front and back of one visiting card. Extract its details.
Copy text exactly as printed, in any script. List every phone number once, as a mobile or a landline.
Give each full multi-line address as one string. Put anything that fits no field in "other".
Use an empty string or empty array when a field is absent. Never invent anything.`;

const str = { type: 'string' };
const list = { type: 'array', items: str };
export const SCHEMA = {
  type: 'object',
  properties: {
    businessName: str, contactPerson: str, designation: str,
    mobiles: list, landlines: list, emails: list, addresses: list,
    website: str, gstin: str, description: str, other: str,
  },
  required: Object.keys(emptyFields),
};

export function buildRequest(images: { base64: string }[]) {
  return {
    contents: [{
      role: 'user',
      parts: [
        { text: PROMPT },
        ...images.map((i) => ({ inline_data: { mime_type: 'image/jpeg', data: i.base64 } })),
      ],
    }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseJsonSchema: SCHEMA },
  };
}

const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const l = (v: unknown) => {
  const arr = Array.isArray(v) ? v : typeof v === 'string' ? [v] : [];
  return [...new Set(arr.map(s).filter(Boolean))];
};

export function parseExtraction(json: unknown): CardFields {
  const parts = (json as any)?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p: any) => (typeof p?.text === 'string' ? p.text : '')).join('').trim()
    : '';
  if (!text) {
    // a 200 with no text means Gemini blocked or cut the answer; say why
    const why = (json as any)?.promptFeedback?.blockReason ?? (json as any)?.candidates?.[0]?.finishReason;
    if (why && why !== 'STOP') throw new ExtractError('blocked', 'Blocked', `Gemini stopped: ${why}`);
    throw new ExtractError('parse', 'Empty response', 'Gemini returned an empty answer');
  }
  return fieldsFromText(text);
}

/** JSON text from either model → clean fields; unparseable text lands in "other" */
export function fieldsFromText(text: string): CardFields {
  const raw = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let o: any;
  try {
    o = JSON.parse(raw);
  } catch {
    return { ...emptyFields, other: text };
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ...emptyFields, other: text };
  return {
    businessName: s(o.businessName), contactPerson: s(o.contactPerson), designation: s(o.designation),
    mobiles: l(o.mobiles), landlines: l(o.landlines), emails: l(o.emails), addresses: l(o.addresses),
    website: s(o.website), gstin: s(o.gstin), description: s(o.description), other: s(o.other),
  };
}

export async function extractCard(
  images: { base64: string }[],
  apiKey: string,
  model: string,
  timeoutMs = 45000,
  retryMs = [1500, 4000],
): Promise<CardFields> {
  for (let i = 0; ; i++) {
    try {
      return await requestOnce(images, apiKey, model, timeoutMs);
    } catch (e) {
      // Gemini answers 503 "high demand" in bursts; a short wait usually clears it
      const busy = e instanceof ExtractError && e.kind === 'busy';
      if (!busy || i >= retryMs.length) throw e;
      await new Promise((r) => setTimeout(r, retryMs[i]));
    }
  }
}

async function requestOnce(images: { base64: string }[], apiKey: string, model: string, timeoutMs: number): Promise<CardFields> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // body kept as raw text: the 400 key check reads it, and parse failures map to 'parse'
    let res: { status: number; data: string };
    try {
      res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        JSON.stringify(buildRequest(images)),
        {
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          signal: ctrl.signal,
          responseType: 'text',
          transformResponse: (d) => d,
          validateStatus: () => true,
        },
      );
    } catch {
      throw ctrl.signal.aborted
        ? new ExtractError('timeout', undefined, `Gemini took longer than ${timeoutMs / 1000}s`)
        : new ExtractError('network', undefined, 'Could not reach Gemini');
    }
    if (res.status >= 400) {
      const body = typeof res.data === 'string' ? res.data : '';
      throw new ExtractError(kindForStatus(res.status, body), `HTTP ${res.status}`, errorDetail(res.status, body));
    }
    try {
      return parseExtraction(JSON.parse(res.data));
    } catch (e) {
      throw e instanceof ExtractError ? e : new ExtractError(ctrl.signal.aborted ? 'timeout' : 'parse', undefined, 'Gemini sent a reply the app could not read');
    }
  } finally {
    clearTimeout(timer);
  }
}
