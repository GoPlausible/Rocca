/**
 * Helpers for identifying the "primary" account / identity in Rocca.
 *
 * "Primary" = the keystore key derived at `account=0, index=0` for the
 * relevant context. Today every Rocca user has exactly one of each
 * (created at onboarding/import for context=0 and context=1), so the
 * badge appears on the only row in each list — but the UI is ready for
 * sibling derivations once wallet plumbing introduces account=1+ or
 * index=1+ keys.
 *
 * Detection looks up `account.metadata.keyId` (or
 * `identity.metadata.keyId`) in the keystore, then checks the underlying
 * key's metadata.context/account/index. Falling back to
 * `key.metadata.context` against an expected value lets us discriminate
 * between account-primary and identity-primary by the same path.
 */

interface KeyLite {
  id: string;
  type?: string;
  metadata?: {
    context?: number;
    account?: number;
    index?: number;
    [k: string]: unknown;
  };
}

interface AccountLike {
  metadata?: { keyId?: string; [k: string]: unknown };
}

interface IdentityLike {
  metadata?: { keyId?: string; [k: string]: unknown };
}

function isPrimaryKey(key: KeyLite | undefined, expectedContext: 0 | 1): boolean {
  if (!key) return false;
  const m = key.metadata ?? {};
  return (
    (m.context ?? 0) === expectedContext &&
    (m.account ?? 0) === 0 &&
    (m.index ?? 0) === 0
  );
}

export function isPrimaryAccount(
  account: AccountLike | undefined,
  keys: ReadonlyArray<KeyLite>,
): boolean {
  const keyId = account?.metadata?.keyId;
  if (!keyId) return false;
  const key = keys.find((k) => k.id === keyId);
  return isPrimaryKey(key, 0);
}

export function isPrimaryIdentity(
  identity: IdentityLike | undefined,
  keys: ReadonlyArray<KeyLite>,
): boolean {
  const keyId = identity?.metadata?.keyId;
  if (!keyId) return false;
  const key = keys.find((k) => k.id === keyId);
  return isPrimaryKey(key, 1);
}
