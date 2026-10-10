/**
 * AegisVault - Zero-Knowledge Client-Side Password Manager
 * Phase 1: Project scaffold, crypto & DB modules, full UI for create/unlock,
 * adding and displaying encrypted credentials.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  VaultStatus,
  DecryptedCredential,
  RawCredentialPayload,
  EncryptedCredentialRecord,
  VaultMeta,
} from './types/vault';
import {
  isWebCryptoSupported,
  generateSalt,
  bytesToBase64,
  base64ToBytes,
  deriveKeyFromPassword,
  createVaultVerifier,
  verifyDerivedKey,
  encryptString,
  decryptString,
  PBKDF2_ITERATIONS,
} from './crypto/vaultCrypto';
import {
  isIndexedDbSupported,
  getVaultMeta,
  saveVaultMeta,
  getAllEncryptedCredentials,
  saveEncryptedCredential,
  deleteEncryptedCredential,
  resetVaultDatabase,
} from './db/vaultDb';
import {
  broadcastLock,
  broadcastVaultUpdated,
  subscribeToSync,
} from './utils/vaultSync';
import { UnsupportedNotice } from './components/UnsupportedNotice';
import { CreateVaultScreen } from './components/CreateVaultScreen';
import { UnlockScreen } from './components/UnlockScreen';
import { VaultDashboard } from './components/VaultDashboard';

export default function App() {
  const [status, setStatus] = useState<VaultStatus>('checking');
  const [unsupportedReason, setUnsupportedReason] = useState<'crypto' | 'indexeddb' | 'general'>('general');
  const [unsupportedMessage, setUnsupportedMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [corruptedCount, setCorruptedCount] = useState<number>(0);
  const [decryptedCredentials, setDecryptedCredentials] = useState<DecryptedCredential[]>([]);

  // Cryptographic key held strictly in-memory while unlocked.
  // When locked, this ref is wiped (set to null) along with all decrypted state.
  const masterKeyRef = useRef<CryptoKey | null>(null);

  /**
   * Initializes environment checks and vault metadata detection.
   */
  const checkVaultState = useCallback(async () => {
    setStatus('checking');
    setUnsupportedMessage('');

    // 1. Verify Web Crypto Subtle availability
    if (!isWebCryptoSupported()) {
      setUnsupportedReason('crypto');
      setStatus('unsupported');
      return;
    }

    // 2. Verify IndexedDB availability
    if (!isIndexedDbSupported()) {
      setUnsupportedReason('indexeddb');
      setStatus('unsupported');
      return;
    }

    try {
      const meta = await getVaultMeta();
      if (!meta) {
        setStatus('uninitialized');
      } else {
        setStatus('locked');
      }
    } catch (err) {
      setUnsupportedReason('indexeddb');
      setUnsupportedMessage(
        err instanceof Error ? err.message : 'Failed to query local database.'
      );
      setStatus('unsupported');
    }
  }, []);

  useEffect(() => {
    checkVaultState();
  }, [checkVaultState]);

  /**
   * Locks the vault immediately, wiping all decrypted state from memory and DOM.
   */
  const handleLock = useCallback((shouldBroadcast: boolean = true) => {
    masterKeyRef.current = null;
    setDecryptedCredentials([]);
    setCorruptedCount(0);
    setStatus('locked');

    if (shouldBroadcast) {
      broadcastLock();
    }
  }, []);

  /**
   * Loads and decrypts all credentials from IndexedDB using the provided key.
   * Gracefully skips any corrupted records that fail decryption.
   */
  const decryptAllCredentials = useCallback(
    async (key: CryptoKey): Promise<{ credentials: DecryptedCredential[]; corrupted: number }> => {
      const encryptedRecords = await getAllEncryptedCredentials();
      const validCredentials: DecryptedCredential[] = [];
      let corrupted = 0;

      for (const record of encryptedRecords) {
        try {
          const decryptedJson = await decryptString(record.ciphertext, record.iv, key);
          const parsed = JSON.parse(decryptedJson) as RawCredentialPayload;

          validCredentials.push({
            ...parsed,
            id: record.id,
          });
        } catch {
          // Record failed decryption (e.g. invalid ciphertext, tampered data, bad auth tag).
          // Do not crash the entire list!
          corrupted++;
        }
      }

      return { credentials: validCredentials, corrupted };
    },
    []
  );

  /**
   * Creates a brand new encrypted vault with a master password.
   */
  const handleCreateVault = async (password: string) => {
    setIsLoading(true);
    try {
      // 1. Generate fresh 32-byte salt
      const salt = generateSalt();

      // 2. Derive non-extractable AES-GCM 256 key
      const derivedKey = await deriveKeyFromPassword(password, salt, PBKDF2_ITERATIONS);

      // 3. Create sentinel verifier
      const verifier = await createVaultVerifier(derivedKey);

      // 4. Save metadata to IndexedDB
      const meta: VaultMeta = {
        id: 'vault_meta',
        salt: bytesToBase64(salt),
        verifier,
        createdAt: Date.now(),
        version: 1,
        iterations: PBKDF2_ITERATIONS,
      };
      await saveVaultMeta(meta);

      // 5. Store key in memory and unlock
      masterKeyRef.current = derivedKey;
      setDecryptedCredentials([]);
      setCorruptedCount(0);
      setStatus('unlocked');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Unlocks the vault by validating master password against stored verifier.
   */
  const handleUnlock = async (password: string) => {
    setIsLoading(true);
    try {
      const meta = await getVaultMeta();
      if (!meta) {
        throw new Error('Vault metadata not found. Please re-initialize.');
      }

      const salt = base64ToBytes(meta.salt);
      const derivedKey = await deriveKeyFromPassword(password, salt, meta.iterations || PBKDF2_ITERATIONS);

      // Verify key against stored sentinel
      const isValid = await verifyDerivedKey(derivedKey, meta.verifier);
      if (!isValid) {
        throw new Error('Invalid master password. Please verify and try again.');
      }

      // Decrypt all credentials in local database
      const { credentials, corrupted } = await decryptAllCredentials(derivedKey);

      masterKeyRef.current = derivedKey;
      setDecryptedCredentials(credentials);
      setCorruptedCount(corrupted);
      setStatus('unlocked');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Adds a new credential:
   * 1. Encrypts JSON payload with derived AES-GCM key and fresh 12-byte IV.
   * 2. Stores { id, iv, ciphertext, createdAt } in IndexedDB (NO plaintext site/username/password/notes).
   * 3. Updates local decrypted state.
   */
  const handleAddCredential = async (payload: RawCredentialPayload) => {
    if (!masterKeyRef.current) {
      throw new Error('Vault is currently locked.');
    }

    let id: string;
    if (typeof window.crypto.randomUUID === 'function') {
      id = window.crypto.randomUUID();
    } else {
      const randomBuf = new Uint8Array(16);
      window.crypto.getRandomValues(randomBuf);
      id = Array.from(randomBuf, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    const payloadJson = JSON.stringify(payload);

    // Encrypt payload with fresh IV
    const { iv, ciphertext } = await encryptString(payloadJson, masterKeyRef.current);

    const record: EncryptedCredentialRecord = {
      id,
      iv,
      ciphertext,
      createdAt: payload.createdAt,
    };

    // Store in IndexedDB
    await saveEncryptedCredential(record);

    // Update in-memory state
    setDecryptedCredentials((prev) => [...prev, { ...payload, id }]);

    // Notify other open tabs
    broadcastVaultUpdated();
  };

  /**
   * Deletes a credential from IndexedDB and local state.
   */
  const handleDeleteCredential = async (id: string) => {
    await deleteEncryptedCredential(id);
    setDecryptedCredentials((prev) => prev.filter((item) => item.id !== id));
    broadcastVaultUpdated();
  };

  /**
   * Completely purges the local vault database and resets state.
   */
  const handleResetVault = async () => {
    await resetVaultDatabase();
    handleLock(false);
    setStatus('uninitialized');
  };

  /**
   * Cross-tab synchronization effect.
   * If any tab locks the vault, all open tabs immediately lock and purge decrypted state.
   */
  useEffect(() => {
    const unsubscribe = subscribeToSync(
      () => {
        // LOCK received from another tab
        handleLock(false);
      },
      async () => {
        // VAULT_UPDATED received from another tab
        if (masterKeyRef.current && status === 'unlocked') {
          const { credentials, corrupted } = await decryptAllCredentials(masterKeyRef.current);
          setDecryptedCredentials(credentials);
          setCorruptedCount(corrupted);
        }
      },
      () => {
        // VAULT_RESET received
        handleLock(false);
        setStatus('uninitialized');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [handleLock, decryptAllCredentials, status]);

  // Render according to vault state
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Initializing secure cryptographic vault...</p>
        </div>
      </div>
    );
  }

  if (status === 'unsupported') {
    return (
      <UnsupportedNotice
        reason={unsupportedReason}
        errorMessage={unsupportedMessage}
        onRetry={checkVaultState}
      />
    );
  }

  if (status === 'uninitialized') {
    return (
      <CreateVaultScreen
        onVaultCreated={handleCreateVault}
        isLoading={isLoading}
      />
    );
  }

  if (status === 'locked') {
    return (
      <UnlockScreen
        onUnlock={handleUnlock}
        onResetVault={handleResetVault}
        isLoading={isLoading}
      />
    );
  }

  return (
    <VaultDashboard
      credentials={decryptedCredentials}
      corruptedCount={corruptedCount}
      onLock={() => handleLock(true)}
      onAddCredential={handleAddCredential}
      onDeleteCredential={handleDeleteCredential}
    />
  );
}
