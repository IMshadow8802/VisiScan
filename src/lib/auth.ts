import axios from 'axios';
import Storage from 'expo-sqlite/kv-store';
import { setSession, type Session } from './settings';

const CENTRAL_API_URL = 'https://shadowcodes.in/Central';
const APP_TYPE = 'ECRM_EMP';

export type Company = { code: string; name: string | null; apiBase: string };

/** Company code → the company's CRM base URL, via Central (same rules as CRM mobile's centralQueries). */
export async function lookupCompany(compCode: string): Promise<Company> {
  const code = compCode.trim().toUpperCase();
  if (!code) throw new Error('Enter your company code');
  let body: any;
  try {
    const res = await axios.get(`${CENTRAL_API_URL}/api/clients/${encodeURIComponent(code)}`, {
      params: { appType: APP_TYPE },
      timeout: 10_000,
    });
    body = res.data;
  } catch (err: any) {
    const status: number | undefined = err?.response?.status;
    if (status === 404) throw new Error('Company not found. Check the code.');
    if (status === 403) throw new Error(err?.response?.data?.message || 'License not active, contact admin');
    if (err?.code === 'ECONNABORTED') throw new Error('Connection timed out. Try again.');
    throw new Error('Could not reach the licensing server.');
  }
  const row = body?.data;
  if (!body?.success || !row?.BaseURL) throw new Error('Invalid company code');
  return { code: row.CompCode ?? code, name: row.Company ?? null, apiBase: String(row.BaseURL).replace(/\/+$/, '') };
}

// last company used, so after sign out the app opens straight on the password step
export const getLastCompany = (): Company | null => {
  try {
    return JSON.parse(Storage.getItemSync('lastCompany') ?? 'null');
  } catch {
    return null;
  }
};
export const setLastCompany = (c: Company | null) =>
  c ? Storage.setItemSync('lastCompany', JSON.stringify(c)) : Storage.removeItemSync('lastCompany');

/** Signs in to the company's CRM and stores the session. Throws with the server's message on failure. */
export async function signIn(compCode: string, identifier: string, password: string): Promise<Session> {
  if (!identifier.trim() || !password) throw new Error('Enter your username and password');
  // looked up again at sign-in so a licence that lapsed since step 1 is still caught
  const { apiBase, name } = await lookupCompany(compCode);
  let body: any;
  try {
    // validateStatus: a 401 here means wrong password, shown on the form (not a session expiry)
    const res = await axios.post(
      `${apiBase}/api/auth/loginUser`,
      { identifier: identifier.trim(), password, Device: 'mobile' },
      { timeout: 20_000, validateStatus: () => true },
    );
    body = res.data;
  } catch (err: any) {
    throw new Error(err?.code === 'ECONNABORTED' ? 'Connection timed out. Try again.' : 'Could not reach the CRM server.');
  }
  const token = body?.data?.token;
  if (!body?.success || !token) throw new Error(body?.message || 'Sign in failed');
  // Central's name first: it is the licensed name, while the CRM's own company settings may still be placeholders
  const s = {
    apiBase,
    token,
    userName: body.data.user?.FullName ?? identifier.trim(),
    companyName: name ?? body.data.company?.CompName ?? compCode.trim().toUpperCase(),
  };
  setSession(s);
  return s;
}

/** Clears the session only; unsynced cards stay in the local db and upload after the next sign-in. */
export const signOut = () => setSession(null);
