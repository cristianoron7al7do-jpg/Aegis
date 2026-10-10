/**
 * IndexedDB storage layer for AegisVault.
 * Stores only encrypted ciphertexts, IVs, and metadata.
 * NO plaintext site names, usernames, passwords, or notes are ever stored here.
 */

import { EncryptedCredentialRecord, VaultMeta } from '../types/vault';

const DB_NAME = 'AegisVaultDB';
const DB_VERSION = 1;
const STORE_META = 'vault_meta';
const STORE_CREDENTIALS = 'encrypted_credentials';

/**
 * Checks whether IndexedDB is available and functional in the browser.
 */
export function isIndexedDbSupported(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

let dbInstance: IDBDatabase | null = null;

/**
 * Opens or initializes the AegisVault IndexedDB database.
 */
export function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    if (!isIndexedDbSupported()) {
      reject(new Error('IndexedDB is not supported or is disabled in your browser (e.g., restricted private mode).'));
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Meta store: holds vault salt and verifier
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'id' });
        }

        // Credentials store: holds encrypted payloads only
        // Primary key: id (UUID)
        if (!db.objectStoreNames.contains(STORE_CREDENTIALS)) {
          const credStore = db.createObjectStore(STORE_CREDENTIALS, { keyPath: 'id' });
          credStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;

        dbInstance.onversionchange = () => {
          dbInstance?.close();
          dbInstance = null;
        };

        resolve(dbInstance);
      };

      request.onerror = () => {
        reject(
          request.error ||
          new Error('Failed to open IndexedDB. Local storage access might be restricted.')
        );
      };

      request.onblocked = () => {
        reject(new Error('IndexedDB access is blocked by another open tab or session.'));
      };
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Unable to initialize IndexedDB storage.'));
    }
  });
}

/**
 * Retrieves the stored vault metadata (salt, verifier token, iteration count).
 */
export async function getVaultMeta(): Promise<VaultMeta | null> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_META, 'readonly');
      const store = tx.objectStore(STORE_META);
      const req = store.get('vault_meta');

      req.onsuccess = () => {
        resolve(req.result || null);
      };

      req.onerror = () => {
        reject(req.error || new Error('Failed to read vault metadata.'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Persists vault metadata on initial setup.
 */
export async function saveVaultMeta(meta: VaultMeta): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_META, 'readwrite');
      const store = tx.objectStore(STORE_META);
      const req = store.put(meta);

      req.onsuccess = () => {
        resolve();
      };

      req.onerror = () => {
        reject(req.error || new Error('Failed to save vault metadata.'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves all encrypted credential records from IndexedDB.
 * Returns only { id, iv, ciphertext, createdAt } without any plaintext.
 */
export async function getAllEncryptedCredentials(): Promise<EncryptedCredentialRecord[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_CREDENTIALS, 'readonly');
      const store = tx.objectStore(STORE_CREDENTIALS);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };

      req.onerror = () => {
        reject(req.error || new Error('Failed to fetch credentials from IndexedDB.'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Stores a new or updated encrypted credential record.
 * Must NOT contain plaintext site names, usernames, passwords, or notes.
 */
export async function saveEncryptedCredential(record: EncryptedCredentialRecord): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_CREDENTIALS, 'readwrite');
      const store = tx.objectStore(STORE_CREDENTIALS);
      const req = store.put(record);

      req.onsuccess = () => {
        resolve();
      };

      req.onerror = () => {
        reject(req.error || new Error('Failed to save encrypted credential.'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Deletes an encrypted credential by ID.
 */
export async function deleteEncryptedCredential(id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_CREDENTIALS, 'readwrite');
      const store = tx.objectStore(STORE_CREDENTIALS);
      const req = store.delete(id);

      req.onsuccess = () => {
        resolve();
      };

      req.onerror = () => {
        reject(req.error || new Error('Failed to delete encrypted credential.'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Resets the local vault database completely.
 */
export async function resetVaultDatabase(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }

  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Failed to reset database.'));
    req.onblocked = () => reject(new Error('Reset blocked: close other tabs first.'));
  });
}
