import { extractWithClaude } from './claude';
import { extractCard, ExtractError } from './gemini';
import { getApiKey, getClaudeKey, getModel } from './settings';
import type { CardFields } from './types';

const asExtractError = (e: unknown) =>
  e instanceof ExtractError ? e : new ExtractError('server', undefined, String((e as Error)?.message ?? e));

/** Claude reads the card; any Claude failure falls back to Gemini (free tier). Both fail → both reasons shown. */
export async function readCard(images: { base64: string }[]): Promise<CardFields> {
  const claudeKey = await getClaudeKey();
  const geminiKey = await getApiKey();
  if (!claudeKey && !geminiKey) throw new ExtractError('key', undefined, 'No Claude or Gemini key in .env.local');
  let claudeErr: ExtractError | null = null;
  if (claudeKey) {
    try {
      return await extractWithClaude(images, claudeKey);
    } catch (e) {
      claudeErr = asExtractError(e);
      console.warn('Claude failed, trying Gemini:', claudeErr.detail);
      if (!geminiKey) throw claudeErr;
    }
  }
  try {
    return await extractCard(images, geminiKey!, await getModel());
  } catch (e) {
    const err = asExtractError(e);
    if (claudeErr) err.detail = `${claudeErr.detail}\n${err.detail}`;
    throw err;
  }
}
