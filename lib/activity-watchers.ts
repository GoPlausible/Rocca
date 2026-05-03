/**
 * App-wide activity watchers — subscribe to the source-of-truth stores
 * (accounts, identities, passkeys, sessions) at module load, diff their
 * state on each change, and emit `appendActivity` for every meaningful
 * delta. Side-effect import: no exports, just imported once from
 * `app/_layout.tsx` to wire everything up.
 *
 * Note on auto-populated entries: `WithAccountsKeystore`, `WithIdentitiesKeystore`,
 * and `WithPasskeysKeystore` all populate their stores from existing
 * keystore content during `bootstrap()` in `_layout.tsx`. Those initial
 * additions WILL fire `account.added` / `identity.added` / `passkey.added`
 * activity entries on first cold start after onboarding — that's fine.
 * Subsequent restarts won't re-fire because state is already populated
 * when the watcher attaches its first snapshot.
 */
import { accountsStore } from '@/stores/accounts';
import { identitiesStore } from '@/stores/identities';
import { passkeysStore } from '@/stores/passkeys';
import { sessionsStore } from '@/stores/sessions';
import { appendActivity } from '@/stores/activity';

interface AccountLite {
  address: string;
}
interface IdentityLite {
  address: string;
  did?: string;
}
interface PasskeyLite {
  id: string;
  name?: string;
}
interface SessionLite {
  id: string;
  origin: string;
}

let prevAccounts = new Set<string>(
  (accountsStore.state.accounts as AccountLite[]).map((a) => a.address),
);
let prevIdentities = new Set<string>(
  (identitiesStore.state.identities as IdentityLite[]).map((i) => i.did ?? i.address),
);
let prevPasskeys = new Set<string>(
  (passkeysStore.state.passkeys as PasskeyLite[]).map((p) => p.id),
);
let prevSessions = new Set<string>(
  (sessionsStore.state.sessions as SessionLite[]).map((s) => `${s.origin}:${s.id}`),
);

accountsStore.subscribe(() => {
  const next = new Set<string>(
    (accountsStore.state.accounts as AccountLite[]).map((a) => a.address),
  );
  for (const addr of next) {
    if (!prevAccounts.has(addr)) {
      appendActivity({
        kind: 'account.added',
        title: 'Account added',
        subtitle: shortenIdentifier(addr),
        meta: { address: addr },
      });
    }
  }
  for (const addr of prevAccounts) {
    if (!next.has(addr)) {
      appendActivity({
        kind: 'account.removed',
        title: 'Account removed',
        subtitle: shortenIdentifier(addr),
        meta: { address: addr },
      });
    }
  }
  prevAccounts = next;
});

identitiesStore.subscribe(() => {
  const list = identitiesStore.state.identities as IdentityLite[];
  const nextById = new Map<string, IdentityLite>();
  for (const i of list) nextById.set(i.did ?? i.address, i);
  const next = new Set<string>(nextById.keys());
  for (const id of next) {
    if (!prevIdentities.has(id)) {
      appendActivity({
        kind: 'identity.added',
        title: 'Identity added',
        subtitle: shortenIdentifier(id),
        meta: { did: id },
      });
    }
  }
  for (const id of prevIdentities) {
    if (!next.has(id)) {
      appendActivity({
        kind: 'identity.removed',
        title: 'Identity removed',
        subtitle: shortenIdentifier(id),
        meta: { did: id },
      });
    }
  }
  prevIdentities = next;
});

passkeysStore.subscribe(() => {
  const list = passkeysStore.state.passkeys as PasskeyLite[];
  const nextById = new Map<string, PasskeyLite>();
  for (const p of list) nextById.set(p.id, p);
  const next = new Set<string>(nextById.keys());
  for (const id of next) {
    if (!prevPasskeys.has(id)) {
      const p = nextById.get(id);
      appendActivity({
        kind: 'passkey.added',
        title: 'Passkey added',
        subtitle: p?.name ?? shortenIdentifier(id),
        meta: { id },
      });
    }
  }
  for (const id of prevPasskeys) {
    if (!next.has(id)) {
      appendActivity({
        kind: 'passkey.removed',
        title: 'Passkey removed',
        subtitle: shortenIdentifier(id),
        meta: { id },
      });
    }
  }
  prevPasskeys = next;
});

sessionsStore.subscribe(() => {
  const list = sessionsStore.state.sessions as SessionLite[];
  const nextById = new Map<string, SessionLite>();
  for (const s of list) nextById.set(`${s.origin}:${s.id}`, s);
  const next = new Set<string>(nextById.keys());
  for (const k of next) {
    if (!prevSessions.has(k)) {
      const s = nextById.get(k);
      appendActivity({
        kind: 'connection.paired',
        title: 'Connection paired',
        subtitle: s?.origin,
        meta: { origin: s?.origin ?? '', requestId: s?.id ?? '' },
      });
    }
  }
  for (const k of prevSessions) {
    if (!next.has(k)) {
      const [origin, id] = k.split(':');
      appendActivity({
        kind: 'connection.removed',
        title: 'Connection removed',
        subtitle: origin,
        meta: { origin: origin ?? '', requestId: id ?? '' },
      });
    }
  }
  prevSessions = next;
});

function shortenIdentifier(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-8)}`;
}
