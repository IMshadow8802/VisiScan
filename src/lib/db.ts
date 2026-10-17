import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { currentUri } from './photos';
import { fromRow as parseRow, toRow, type ContactRow } from './rows';
import type { Contact } from './types';

const COLS = [
  'id', 'businessName', 'contactPerson', 'designation', 'mobiles', 'landlines', 'emails',
  'addresses', 'website', 'gstin', 'description', 'other', 'notes', 'color', 'frontUri',
  'backUri', 'createdAt', 'updatedAt',
] as const;

const fromRow = (r: ContactRow): Contact => {
  const c = parseRow(r);
  return { ...c, frontUri: currentUri(c.frontUri), backUri: currentUri(c.backUri) };
};

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((row?.user_version ?? 0) < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS contacts (
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
  if ((row?.user_version ?? 0) < 2) {
    // syncedAt is null until the server has this version; saveContact's REPLACE resets it on edit
    await db.execAsync(`
      ALTER TABLE contacts ADD COLUMN syncedAt TEXT;
      CREATE TABLE IF NOT EXISTS pending_deletes (id TEXT PRIMARY KEY NOT NULL);
      PRAGMA user_version = 2;
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
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM contacts WHERE id = ?', id);
    await db.runAsync('INSERT OR IGNORE INTO pending_deletes (id) VALUES (?)', id);
  });
}

export async function unsyncedContacts(): Promise<Contact[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ContactRow>('SELECT * FROM contacts WHERE syncedAt IS NULL ORDER BY createdAt');
  return rows.map(fromRow);
}

// only marks the version that was uploaded; an edit made mid-upload stays unsynced
export async function markSynced(c: Pick<Contact, 'id' | 'updatedAt'>): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE contacts SET syncedAt = ? WHERE id = ? AND updatedAt = ?', new Date().toISOString(), c.id, c.updatedAt);
}

export async function pendingDeletes(): Promise<string[]> {
  const db = await getDb();
  return (await db.getAllAsync<{ id: string }>('SELECT id FROM pending_deletes')).map((r) => r.id);
}

export async function clearPendingDelete(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM pending_deletes WHERE id = ?', id);
}
