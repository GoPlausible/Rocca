import { Store } from '@tanstack/react-store';
import { createMMKV } from 'react-native-mmkv';

/**
 * History of signing operations performed by Rocca's keys. Each entry
 * records who asked, what was signed, with which key, and the resulting
 * signature. Persists across launches so users have a reviewable record
 * of what they've authorized.
 *
 * Populated from the `useConnection` AC2 SigningRequest flow on
 * approve/reject. Self-initiated signing (e.g. transaction send when
 * wallet plumbing lands) feeds the same store.
 */

/**
 * Type of key that produced the signature. Used by the UI to color-code
 * entries and to show which surface authorized the operation.
 */
export type SignatureKeyType =
  | 'account'   // Ed25519 context=0 — signs transactions, AC2 wallet sigs
  | 'identity'  // Ed25519 context=1 — signs DID-bound things, VCs
  | 'passkey';  // P-256 FIDO2 — signs WebAuthn assertion challenges

/**
 * What the signature is for. Drives both the description shown in lists
 * and what fields are populated on the entry.
 */
export type SignatureKind =
  | 'ac2.signing_request'    // From an AC2 SigningRequest sent by an agent
  | 'liquid_auth.challenge'  // Ed25519 sig on the Liquid Auth WebAuthn challenge
  | 'webauthn.assertion'     // The P-256 passkey assertion signature itself
  | 'transaction';            // Future: on-chain transaction signatures

export type SignatureStatus = 'approved' | 'rejected';

export interface SignatureEntry {
  /** Stable id; matches the AC2 SigningRequest envelope id when applicable. */
  id: string;
  ts: number;
  kind: SignatureKind;
  status: SignatureStatus;
  keyType: SignatureKeyType;
  /** Originating peer (DID or origin URL) — null for self-initiated signing. */
  origin?: string;
  /** Human-readable purpose carried in the AC2 SigningRequest body. */
  description: string;
  /** Base64 of the bytes signed. */
  payloadBase64: string;
  /** Optional: the resulting signature (base64). Absent for `rejected`. */
  signatureBase64?: string;
  /** Optional: 58-char Algorand address derived from the signing key. */
  address?: string;
  /** Optional rejection reason. */
  reason?: string;
}

export interface SignaturesState {
  entries: SignatureEntry[];
}

const STORAGE_KEY = 'signatures';
const storage = createMMKV({ id: 'signatures' });

/** Hard cap to prevent unbounded growth — FIFO drop on overflow. */
const MAX_ENTRIES = 1000;

const loadInitial = (): SignaturesState => {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SignaturesState>;
      if (Array.isArray(parsed.entries)) {
        return { entries: parsed.entries as SignatureEntry[] };
      }
    }
  } catch (err) {
    console.error('Failed to load signatures:', err);
  }
  return { entries: [] };
};

export const signaturesStore = new Store<SignaturesState>(loadInitial());

signaturesStore.subscribe(() => {
  try {
    storage.set(STORAGE_KEY, JSON.stringify(signaturesStore.state));
  } catch (err) {
    console.error('Failed to save signatures:', err);
  }
});

export function appendSignature(entry: SignatureEntry): void {
  signaturesStore.setState((s) => {
    const all = [...s.entries, entry];
    const trimmed = all.length > MAX_ENTRIES ? all.slice(all.length - MAX_ENTRIES) : all;
    return { entries: trimmed };
  });
}

export function getSignature(id: string): SignatureEntry | undefined {
  return signaturesStore.state.entries.find((e) => e.id === id);
}

export function clearSignatures(): void {
  signaturesStore.setState(() => ({ entries: [] }));
}
