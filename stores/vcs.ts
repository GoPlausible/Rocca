import { Store } from '@tanstack/react-store';
import { createMMKV } from 'react-native-mmkv';

/**
 * Verifiable Credentials issued (or received) by Rocca. Each entry holds
 * the full VC document (W3C VC 2.0 shape) plus our local metadata for
 * listing — issuer DID, subject summary, template name, status.
 *
 * v0 supports issuance from the `ap2-mandate` template — bounded
 * authority granted to an agent for a specific operation/scope. Future
 * templates plug in by adding a new entry to `VC_TEMPLATES` and a render
 * branch in the issuance modal.
 */

export type VCTemplateId = 'ap2-mandate';

export interface VC {
  /** Local id; mirrors the VC's `id` field if set. */
  id: string;
  /** Wall-clock when added to the local store. */
  ts: number;
  /** Which template produced this credential (drives detail rendering). */
  template: VCTemplateId;
  /** DID of the issuer (one of Rocca's identities). */
  issuer: string;
  /** Short summary line for list views ("Authorize agent X to spend up to N"). */
  subjectSummary: string;
  /** The full W3C VC 2.0 document. */
  document: Record<string, unknown>;
  /** Optional revocation flag — local-only, doesn't reflect on-chain status. */
  revoked?: boolean;
}

export interface VCsState {
  entries: VC[];
}

const STORAGE_KEY = 'vcs';
const storage = createMMKV({ id: 'vcs' });
const MAX_ENTRIES = 200;

const loadInitial = (): VCsState => {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<VCsState>;
      if (Array.isArray(parsed.entries)) {
        return { entries: parsed.entries as VC[] };
      }
    }
  } catch (err) {
    console.error('Failed to load VCs:', err);
  }
  return { entries: [] };
};

export const vcsStore = new Store<VCsState>(loadInitial());

vcsStore.subscribe(() => {
  try {
    storage.set(STORAGE_KEY, JSON.stringify(vcsStore.state));
  } catch (err) {
    console.error('Failed to save VCs:', err);
  }
});

export function addVC(entry: VC): void {
  vcsStore.setState((s) => {
    const all = [...s.entries, entry];
    const trimmed = all.length > MAX_ENTRIES ? all.slice(all.length - MAX_ENTRIES) : all;
    return { entries: trimmed };
  });
}

export function removeVC(id: string): void {
  vcsStore.setState((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
}

export function setVCRevoked(id: string, revoked: boolean): void {
  vcsStore.setState((s) => ({
    entries: s.entries.map((e) => (e.id === id ? { ...e, revoked } : e)),
  }));
}

export function getVC(id: string): VC | undefined {
  return vcsStore.state.entries.find((e) => e.id === id);
}

// ─── Templates ──────────────────────────────────────────────────────

export interface AP2MandateInput {
  /** DID of the agent being authorized. */
  agentDid: string;
  /** Short purpose label shown in the credential subject. */
  purpose: string;
  /** Optional cap, free-form (e.g. "100 USDC"). v0 keeps this informational. */
  cap?: string;
  /** Optional ISO duration shorthand ("P30D" = 30 days). */
  validFor?: string;
}

/**
 * Build a W3C VC 2.0 document for the AP2 mandate template. The result
 * is the unsigned credential (the proof.jws is added at sign time, see
 * `app/vc-issue.tsx`). Issuer DID is filled in by the caller.
 */
export function buildAP2MandateCredential(input: {
  id: string;
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  mandate: AP2MandateInput;
}): Record<string, unknown> {
  const credentialSubject: Record<string, unknown> = {
    id: input.mandate.agentDid,
    type: 'AP2Mandate',
    purpose: input.mandate.purpose,
  };
  if (input.mandate.cap) credentialSubject.cap = input.mandate.cap;
  if (input.mandate.validFor) credentialSubject.validFor = input.mandate.validFor;

  const doc: Record<string, unknown> = {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://ac2.io/v1',
    ],
    id: input.id,
    type: ['VerifiableCredential', 'AP2MandateCredential'],
    issuer: input.issuer,
    validFrom: input.issuanceDate,
    credentialSubject,
  };
  if (input.expirationDate) doc.validUntil = input.expirationDate;
  return doc;
}
