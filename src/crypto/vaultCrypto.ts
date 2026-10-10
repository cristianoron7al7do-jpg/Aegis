/**
 * Web Crypto API primitives for AegisVault.
 * Enforces:
 * - Non-extractable AES-GCM 256 keys
 * - PBKDF2 key derivation with SHA-256 and unique 32-byte salt
 * - 12-byte cryptographically secure random IV per encryption (zero reuse)
 * - Zero Math.random usage (crypto.getRandomValues only)
 */

import { VaultVerifier } from '../types/vault';

export const PBKDF2_ITERATIONS = 100_000;
const SENTINEL_MAGIC = 'AEGIS_VAULT_SENTINEL_V1';

/**
 * Checks whether Web Crypto Subtle is supported in current context.
 * Typically requires HTTPS or localhost.
 */
export function isWebCryptoSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined'
  );
}

/**
 * Converts a Uint8Array buffer to a Base64 string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string to a Uint8Array buffer.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a random 32-byte salt using Web Crypto.
 */
export function generateSalt(): Uint8Array {
  const salt = new Uint8Array(32);
  window.crypto.getRandomValues(salt);
  return salt;
}

/**
 * Generates a random 12-byte IV for AES-GCM.
 */
export function generateIv(): Uint8Array {
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);
  return iv;
}

/**
 * Derives an AES-GCM 256-bit non-extractable key from a master password and salt.
 * Uses PBKDF2 with SHA-256 and 100,000 iterations.
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  if (!isWebCryptoSupported()) {
    throw new Error('Web Crypto API is not supported in this browser environment.');
  }

  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // CRITICAL: Non-extractable key
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Encrypts an arbitrary string using AES-GCM and a fresh, unique 12-byte IV.
 */
export async function encryptString(
  plaintext: string,
  key: CryptoKey
): Promise<{ iv: string; ciphertext: string }> {
  const iv = generateIv();
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(plaintext);

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    encodedData as unknown as BufferSource
  );

  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipherBuffer)),
  };
}

/**
 * Decrypts AES-GCM ciphertext using the provided key and IV.
 * Throws an error if decryption fails (e.g., auth tag mismatch, wrong key, corruption).
 */
export async function decryptString(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const iv = base64ToBytes(ivBase64);
  const ciphertextBytes = base64ToBytes(ciphertextBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    ciphertextBytes as unknown as BufferSource
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Creates an encrypted sentinel verifier token to safely validate master passwords
 * on subsequent unlock attempts without storing plaintext passwords.
 */
export async function createVaultVerifier(key: CryptoKey): Promise<VaultVerifier> {
  const sentinel = JSON.stringify({
    magic: SENTINEL_MAGIC,
    created: Date.now(),
  });
  return encryptString(sentinel, key);
}

/**
 * Verifies whether the derived key can successfully decrypt the stored sentinel.
 * Returns true if valid, false if wrong password or tampered.
 */
export async function verifyDerivedKey(
  key: CryptoKey,
  verifier: VaultVerifier
): Promise<boolean> {
  try {
    const decrypted = await decryptString(verifier.ciphertext, verifier.iv, key);
    const parsed = JSON.parse(decrypted);
    return parsed?.magic === SENTINEL_MAGIC;
  } catch {
    return false;
  }
}
