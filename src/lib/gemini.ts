import { emptyFields, type CardFields } from './types';

export class ExtractError extends Error {
  constructor(public kind: 'key' | 'quota' | 'network' | 'timeout' | 'server' | 'parse', message?: string) {
    super(message ?? kind);
    this.name = 'ExtractError';
  }
}

const PROMPT = `These images are the front and back of one visiting card. Extract its details.
Copy text exactly as printed, in any script. List every phone number once, as a mobile or a landline.
Give each full multi-line address as one string. Put anything that fits no field in "other".
Use an empty string or empty array when a field is absent. Never invent anything.`;

const str = { type: 'string' };
const list = { type: 'array', items: str };
const SCHEMA = {
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
  if (!text) throw new ExtractError('parse', 'Empty response');
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
  timeoutMs = 30000,
): Promise<CardFields> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(buildRequest(images)),
        signal: ctrl.signal,
      });
    } catch {
      throw new ExtractError(ctrl.signal.aborted ? 'timeout' : 'network');
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 403 || (res.status === 400 && /API_KEY_INVALID|api key/i.test(body))) throw new ExtractError('key');
      throw new ExtractError(res.status === 429 ? 'quota' : 'server', `HTTP ${res.status}`);
    }
    try {
      return parseExtraction(await res.json());
    } catch (e) {
      throw e instanceof ExtractError ? e : new ExtractError(ctrl.signal.aborted ? 'timeout' : 'parse');
    }
  } finally {
    clearTimeout(timer);
  }
}
