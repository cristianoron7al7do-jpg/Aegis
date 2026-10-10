/**
 * Types for AegisVault zero-knowledge credential manager
 */

export interface RawCredentialPayload {
  site: string;
  url: string;
  username: string;
  password: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface EncryptedCredentialRecord {
  id: string;
  iv: string;         // Base64 encoded 12-byte IV
  ciphertext: string; // Base64 encoded AES-GCM ciphertext
  createdAt: number;
}

export interface DecryptedCredential extends RawCredentialPayload {
  id: string;
}

export interface VaultVerifier {
  iv: string;         // Base64 encoded 12-byte IV
  ciphertext: string; // Base64 encoded AES-GCM ciphertext
}

export interface VaultMeta {
  id: string;         // Always 'vault_meta'
  salt: string;       // Base64 encoded 32-byte salt
  verifier: VaultVerifier;
  createdAt: number;
  version: number;
  iterations: number;
}

export type VaultStatus =
  | 'checking'
  | 'unsupported'
  | 'uninitialized'
  | 'locked'
  | 'unlocked';
