import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { fromRow, toRow, type ContactRow } from './rows';
import type { Contact } from './types';

const COLS = [
  'id', 'businessName', 'contactPerson', 'designation', 'mobiles', 'landlines', 'emails',
  'addresses', 'website', 'gstin', 'description', 'other', 'notes', 'color', 'frontUri',
  'backUri', 'createdAt', 'updatedAt',
] as const;

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((row?.user_version ?? 0) < 1) {
    await db.execAsync(`
      CREATE TABLE contacts (
        id TEXT PRIMARY KEY NOT NULL,
        businessName TEXT NOT NULL, contactPerson TEXT NOT NULL, designation TEXT NOT NULL,
        mobiles TEXT NOT NULL, landlines TEXT NOT NULL, emails TEXT NOT NULL, addresses TEXT NOT NULL,
        website TEXT NOT NULL, gstin TEXT NOT NULL, description TEXT NOT NULL, other TEXT NOT NULL,
        notes TEXT NOT NULL, color TEXT NOT NULL, frontUri TEXT NOT NULL, backUri TEXT,
        createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
      );
      PRAGMA user_version = 1;
    `);
  }
}

export function getDb(): Promise<SQLiteDatabase> {
  dbPromise ??= openDatabaseAsync('visiscan.db').then(async (db) => {
    await migrate(db);
    return db;
  });
  return dbPromise;
}

export async function listContacts(): Promise<Contact[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ContactRow>('SELECT * FROM contacts ORDER BY createdAt DESC');
  return rows.map(fromRow);
}

export async function getContact(id: string): Promise<Contact | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<ContactRow>('SELECT * FROM contacts WHERE id = ?', id);
  return r ? fromRow(r) : null;
}

export async function saveContact(c: Contact): Promise<void> {
  const db = await getDb();
  const row = toRow(c);
  await db.runAsync(
    `INSERT OR REPLACE INTO contacts (${COLS.join(',')}) VALUES (${COLS.map(() => '?').join(',')})`,
    COLS.map((k) => row[k] ?? null),
  );
}

export async function deleteContact(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM contacts WHERE id = ?', id);
}
