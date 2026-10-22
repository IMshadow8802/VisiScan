import axios from 'axios';
import { lookupCompany, signIn } from './auth';
import { getSession, setSession } from './settings';

jest.mock('axios');
jest.mock('expo-sqlite/kv-store', () => {
  const m = new Map<string, string>();
  return {
    getItemSync: (k: string) => m.get(k) ?? null,
    setItemSync: (k: string, v: string) => void m.set(k, v),
    removeItemSync: (k: string) => m.delete(k),
  };
});
const get = axios.get as jest.Mock;
const post = axios.post as jest.Mock;
const central = (BaseURL: string) => get.mockResolvedValue({ data: { success: true, data: { BaseURL } } });
afterEach(() => {
  get.mockReset();
  post.mockReset();
  setSession(null);
});

test('lookupCompany sends the code upper-cased with the ECRM_EMP app type, trims the trailing slash', async () => {
  central('https://crm.example.com/');
  expect(await lookupCompany(' testcrm ')).toEqual({ code: 'TESTCRM', name: null, apiBase: 'https://crm.example.com' });
  expect(get).toHaveBeenCalledWith('https://shadowcodes.in/Central/api/clients/TESTCRM', expect.objectContaining({ params: { appType: 'ECRM_EMP' } }));
});

test('lookupCompany maps 404 and 403 (server message)', async () => {
  get.mockRejectedValue({ response: { status: 404 } });
  await expect(lookupCompany('X')).rejects.toThrow('Company not found. Check the code.');
  get.mockRejectedValue({ response: { status: 403, data: { message: 'Licence expired on 1 Oct' } } });
  await expect(lookupCompany('X')).rejects.toThrow('Licence expired on 1 Oct');
});

test('signIn posts to the company login and stores the session', async () => {
  central('https://crm.example.com');
  post.mockResolvedValue({ status: 200, data: { success: true, data: { token: 'tk', user: { FullName: 'Ravi Kumar' }, company: { CompName: 'Acme' } } } });
  await signIn('TestCRM', 'ravi', 'pw');
  expect(post).toHaveBeenCalledWith('https://crm.example.com/api/auth/loginUser', { identifier: 'ravi', password: 'pw', Device: 'mobile' }, expect.anything());
  expect(getSession()).toEqual({ apiBase: 'https://crm.example.com', token: 'tk', userName: 'Ravi Kumar', companyName: 'Acme' });
});

test('signIn shows the server message on failure and stores nothing', async () => {
  central('https://crm.example.com');
  post.mockResolvedValue({ status: 401, data: { success: false, message: 'Invalid username or password' } });
  await expect(signIn('TestCRM', 'ravi', 'bad')).rejects.toThrow('Invalid username or password');
  expect(getSession()).toBeNull();
});
